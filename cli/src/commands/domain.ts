import path from 'node:path';
import pc from 'picocolors';
import type { AcmCertificateDetail, AcmValidationRecord } from '../services/aws.js';
import {
  describeAcmCertificateUsEast1,
  findFrontEndDistributionDomain,
  findHostedZone,
  requestAcmCertificateUsEast1,
  upsertRoute53Cname,
  waitForAcmValidationRecords
} from '../services/aws.js';
import { getStageOrThrow, resolveConfig, tryLoadRawConfig, writeMainConfig } from '../services/config.js';
import type { ResolvedConfig } from '../types.js';
import { showBanner } from '../ui/banner.js';
import { confirm, isNonInteractive, log, note, outro, select, spinner, text, unwrapPrompt } from '../utils/prompt.js';
import { validateDomain } from '../utils/validators.js';
import { runDeploy } from './deploy.js';

export interface DomainCommandOptions {
  stage?: string;
  domain?: string;
  profile?: string;
  region?: string;
  wait?: boolean;
  deploy?: boolean;
  ci?: boolean;
  yes?: boolean;
}

export function domainMatchesPattern(domain: string, pattern: string): boolean {
  if (domain === pattern) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".example.org"
    const idx = domain.indexOf('.');
    return idx > 0 && domain.slice(idx) === suffix;
  }
  return false;
}

export function buildCertificateDomains(
  config: ResolvedConfig,
  extraDomains: string[] = []
): string[] {
  const candidates = new Set<string>([config.domain, `*.${config.domain}`]);
  for (const stage of Object.values(config.stages)) {
    candidates.add(stage.domain);
    for (const alt of stage.alternativeDomains ?? []) {
      candidates.add(alt);
    }
  }
  for (const extra of extraDomains) {
    if (extra) candidates.add(extra);
  }

  // Keep primary domain and wildcard first, plus any domains not already covered by wildcard.
  const wildcard = `*.${config.domain}`;
  const ordered = [config.domain, wildcard];
  for (const d of candidates) {
    if (d === config.domain || d === wildcard) continue;
    if (!domainMatchesPattern(d, wildcard)) {
      ordered.push(d);
    }
  }
  return ordered;
}

export function certCoversDomains(cert: AcmCertificateDetail, requiredDomains: string[]): boolean {
  const covered = [cert.domainName, ...cert.subjectAlternativeNames];
  return requiredDomains.every(req => covered.some(pattern => domainMatchesPattern(req, pattern)));
}

function formatCnameNote(
  validationOptions: AcmValidationRecord[],
  customDomains: string[],
  cloudFrontDomain: string | null
): string {
  const lines: string[] = [];
  const externalValidations = validationOptions.filter(v => v.recordName && v.recordValue);
  if (externalValidations.length > 0) {
    lines.push(pc.bold('1. ACM Validation CNAMEs (add if not already validated):'));
    for (const v of externalValidations) {
      const statusTag =
        v.validationStatus === 'SUCCESS' ? pc.green(' [VALIDATED]') : pc.yellow(` [${v.validationStatus ?? 'PENDING'}]`);
      lines.push(`   Domain: ${pc.cyan(v.domainName)}${statusTag}`);
      lines.push(`   Name:   ${v.recordName}`);
      lines.push(`   Value:  ${v.recordValue}`);
      lines.push('');
    }
  }

  if (customDomains.length > 0) {
    lines.push(pc.bold('2. Custom Domain Traffic Routing CNAME(s):'));
    for (const d of customDomains) {
      lines.push(`   Name:   ${pc.cyan(d)}`);
      lines.push(`   Value:  ${cloudFrontDomain ? pc.green(cloudFrontDomain) : pc.yellow('<deploy backend first to obtain CloudFront domain>')}`);
    }
  }

  return lines.join('\n').trimEnd();
}

async function resolveTargetStage(config: ResolvedConfig, stageOpt?: string, ci?: boolean): Promise<string> {
  const stageNames = Object.keys(config.stages);
  if (stageOpt) {
    getStageOrThrow(config, stageOpt);
    return stageOpt;
  }
  if (stageNames.length === 1) {
    return stageNames[0];
  }
  if (isNonInteractive(ci)) {
    return config.stages.prod ? 'prod' : stageNames[0];
  }
  return unwrapPrompt(
    await select({
      message: 'Target stage:',
      initialValue: config.stages.prod ? 'prod' : stageNames[0],
      options: stageNames.map(name => ({
        value: name,
        label: name,
        hint: config.stages[name].domain
      }))
    })
  );
}

async function maybeUpsertRoute53Validations(
  config: ResolvedConfig,
  stageName: string,
  cert: AcmCertificateDetail,
  awsOpts: { profile?: string; region: string },
  autoApprove: boolean
): Promise<void> {
  const stageCfg = getStageOrThrow(config, stageName);
  const hostedZoneDomain = stageCfg.hostedZoneDomain ?? config.domain;

  const pendingInZone = cert.validationOptions.filter(
    v =>
      v.validationStatus !== 'SUCCESS' &&
      v.recordName &&
      v.recordValue &&
      (v.domainName === hostedZoneDomain || v.domainName.endsWith(`.${hostedZoneDomain}`))
  );

  if (pendingInZone.length === 0) return;

  const zone = await findHostedZone(hostedZoneDomain, awsOpts).catch(() => null);
  if (!zone) return;

  const shouldCreate =
    autoApprove ||
    unwrapPrompt(
      await confirm({
        message: `Create ${pendingInZone.length} ACM validation CNAME record(s) automatically in Route 53 (${zone.name})?`,
        initialValue: true
      })
    );

  if (!shouldCreate) return;

  const seen = new Set<string>();
  for (const rec of pendingInZone) {
    if (!rec.recordName || !rec.recordValue || seen.has(rec.recordName)) continue;
    seen.add(rec.recordName);
    await upsertRoute53Cname(zone.id, rec.recordName, rec.recordValue, awsOpts);
    log.success(`Upserted Route 53 validation record for ${rec.domainName}`);
  }
}

async function pollCertificateUntilIssued(
  certificateArn: string,
  awsOpts: { profile?: string; region: string },
  timeoutMs = 10 * 60 * 1000
): Promise<AcmCertificateDetail> {
  const s = spinner();
  s.start('Waiting for ACM certificate validation in us-east-1 (Ctrl+C to stop waiting)...');
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const detail = await describeAcmCertificateUsEast1(certificateArn, awsOpts);
    if (detail.status === 'ISSUED') {
      s.stop(pc.green('ACM certificate is ISSUED!'));
      return detail;
    }
    if (detail.status === 'FAILED' || detail.status === 'REVOKED' || detail.status === 'VALIDATION_TIMED_OUT') {
      s.stop(pc.red(`ACM certificate status: ${detail.status}`));
      return detail;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const latest = await describeAcmCertificateUsEast1(certificateArn, awsOpts);
  s.stop(pc.yellow(`Still ${latest.status} after waiting.`));
  return latest;
}

export async function runDomainAdd(rawDomain: string | undefined, opts: DomainCommandOptions): Promise<void> {
  const config = resolveConfig();
  const nonInteractive = isNonInteractive(opts.ci);

  if (!nonInteractive) {
    showBanner('Custom Domain');
  }

  const stage = await resolveTargetStage(config, opts.stage, opts.ci);
  const stageCfg = getStageOrThrow(config, stage);
  const awsOpts = {
    profile: opts.profile ?? config.aws.profile,
    region: opts.region ?? config.aws.region
  };

  let customDomain = rawDomain ?? opts.domain;
  if (!customDomain) {
    if (nonInteractive) {
      throw new Error('Custom domain is required in non-interactive mode (pass <domain> or --domain).');
    }
    customDomain = unwrapPrompt(
      await text({
        message: `Custom (alternative) domain for "${stage}" (e.g. assembly.esn.it):`,
        validate: validateDomain
      })
    );
  }
  customDomain = customDomain.trim().toLowerCase();
  const domainErr = validateDomain(customDomain);
  if (domainErr) throw new Error(domainErr);

  const nextAlts = Array.from(new Set([...(stageCfg.alternativeDomains ?? []), customDomain]));
  const requiredDomains = buildCertificateDomains(config, [customDomain]);

  let certificateArn = config.frontEndCertificateARN;
  let certDetail: AcmCertificateDetail | null = null;

  if (certificateArn) {
    const s = spinner();
    s.start('Checking existing ACM certificate in us-east-1...');
    try {
      const existingCert = await describeAcmCertificateUsEast1(certificateArn, awsOpts);
      if (
        (existingCert.status === 'ISSUED' || existingCert.status === 'PENDING_VALIDATION') &&
        certCoversDomains(existingCert, requiredDomains)
      ) {
        certDetail = existingCert;
        s.stop(`Reusing existing ACM certificate (${existingCert.status}).`);
      } else {
        s.stop('Existing certificate does not cover the new domain; requesting an updated certificate.');
      }
    } catch {
      s.stop('Could not inspect existing certificate; requesting a new certificate.');
    }
  }

  if (!certDetail) {
    const s = spinner();
    s.start(`Requesting us-east-1 ACM certificate for ${requiredDomains.join(', ')}...`);
    certificateArn = await requestAcmCertificateUsEast1(config.domain, requiredDomains, awsOpts);
    certDetail = await waitForAcmValidationRecords(certificateArn, awsOpts);
    s.stop(`Requested ACM certificate: ${pc.cyan(certificateArn)}`);
  }

  if (!nonInteractive || opts.yes) {
    await maybeUpsertRoute53Validations(config, stage, certDetail, awsOpts, Boolean(opts.yes));
    certDetail = await describeAcmCertificateUsEast1(certificateArn!, awsOpts);
  }

  const distInfo = await findFrontEndDistributionDomain(config.project, stage, stageCfg.domain, awsOpts);

  note(
    formatCnameNote(certDetail.validationOptions, nextAlts, distInfo?.domainName ?? null),
    `DNS Records for ${customDomain}`
  );

  // Persist to ga-app.config.json
  const rawConfig = tryLoadRawConfig(config.rootDir);
  if (!rawConfig) throw new Error('Could not reload ga-app.config.json');
  rawConfig.frontEndCertificateARN = certificateArn;
  rawConfig.stages[stage] = {
    ...rawConfig.stages[stage],
    alternativeDomains: nextAlts
  };
  const writtenPath = writeMainConfig(config.rootDir, rawConfig);
  log.success(`Updated ${path.relative(config.rootDir, writtenPath)}`);

  if (certDetail.status !== 'ISSUED') {
    const shouldWait =
      opts.wait ||
      (!nonInteractive &&
        unwrapPrompt(
          await confirm({
            message: 'Wait for ACM certificate validation to become ISSUED now?',
            initialValue: false
          })
        ));
    if (shouldWait) {
      certDetail = await pollCertificateUntilIssued(certificateArn!, awsOpts);
    }
  }

  if (certDetail.status === 'ISSUED') {
    const shouldDeploy =
      opts.deploy ||
      (!nonInteractive &&
        unwrapPrompt(
          await confirm({
            message: `Certificate is ISSUED. Deploy "${stage}" back-end now to attach ${customDomain} to CloudFront?`,
            initialValue: true
          })
        ));
    if (shouldDeploy) {
      await runDeploy('backend', {
        stage,
        profile: awsOpts.profile,
        region: awsOpts.region,
        ci: opts.ci,
        yes: true
      });
    }
  } else if (!nonInteractive) {
    outro(
      pc.yellow(
        `Add the DNS records above, then check status with "ga-app domain status" and deploy via "ga-app deploy backend --stage ${stage}".`
      )
    );
  }
}

export async function runDomainStatus(opts: DomainCommandOptions): Promise<void> {
  const config = resolveConfig();
  const nonInteractive = isNonInteractive(opts.ci);
  if (!nonInteractive) {
    showBanner('Custom Domain Status');
  }

  const awsOpts = {
    profile: opts.profile ?? config.aws.profile,
    region: opts.region ?? config.aws.region
  };

  for (const [stageName, stageCfg] of Object.entries(config.stages)) {
    const alts = stageCfg.alternativeDomains ?? [];
    const dist = await findFrontEndDistributionDomain(config.project, stageName, stageCfg.domain, awsOpts);
    log.info(
      `Stage ${pc.cyan(stageName)}: domain=${pc.bold(stageCfg.domain)}` +
      (alts.length > 0 ? ` · alternativeDomains=${pc.cyan(alts.join(', '))}` : ' · no alternativeDomains') +
      (dist ? ` · CloudFront=${pc.dim(dist.domainName)}` : '')
    );
  }

  if (!config.frontEndCertificateARN) {
    log.warn('No frontEndCertificateARN configured (using CDK auto-managed ACM certificates).');
    if (!nonInteractive) outro('Done.');
    return;
  }

  const s = nonInteractive ? null : spinner();
  s?.start('Inspecting ACM certificate in us-east-1...');
  const cert = await describeAcmCertificateUsEast1(config.frontEndCertificateARN, awsOpts);
  s?.stop(`Certificate (${cert.status}): ${pc.cyan(cert.certificateArn)}`);

  const allAlts = Object.values(config.stages).flatMap(st => st.alternativeDomains ?? []);
  const firstStage = Object.keys(config.stages)[0];
  const dist = await findFrontEndDistributionDomain(
    config.project,
    opts.stage ?? firstStage,
    config.stages[opts.stage ?? firstStage].domain,
    awsOpts
  );

  note(
    formatCnameNote(cert.validationOptions, allAlts, dist?.domainName ?? null),
    `ACM Status: ${cert.status}`
  );
  if (!nonInteractive) {
    outro(cert.status === 'ISSUED' ? pc.green('Certificate is ready for deployment.') : pc.yellow('Waiting for DNS validation.'));
  }
}

export async function runDomainRemove(rawDomain: string | undefined, opts: DomainCommandOptions): Promise<void> {
  const config = resolveConfig();
  const nonInteractive = isNonInteractive(opts.ci);
  if (!nonInteractive) {
    showBanner('Remove Custom Domain');
  }

  const stage = await resolveTargetStage(config, opts.stage, opts.ci);
  const stageCfg = getStageOrThrow(config, stage);
  const existingAlts = stageCfg.alternativeDomains ?? [];

  if (existingAlts.length === 0) {
    log.warn(`Stage "${stage}" has no alternativeDomains configured.`);
    if (!nonInteractive) outro('Nothing to remove.');
    return;
  }

  let targetDomain = rawDomain ?? opts.domain;
  if (!targetDomain) {
    if (nonInteractive) {
      throw new Error('Domain to remove is required in non-interactive mode.');
    }
    targetDomain = unwrapPrompt(
      await select({
        message: `Select custom domain to remove
                  from "${stage}":`,
        options: existingAlts.map(d => ({ value: d, label: d }))
      })
    );
  }

  const updatedAlts = existingAlts.filter(d => d !== targetDomain);
  if (updatedAlts.length === existingAlts.length) {
    throw new Error(`"${targetDomain}" is not in stages.${stage}.alternativeDomains.`);
  }

  const rawConfig = tryLoadRawConfig(config.rootDir);
  if (!rawConfig) throw new Error('Could not reload ga-app.config.json');
  if (updatedAlts.length > 0) {
    rawConfig.stages[stage].alternativeDomains = updatedAlts;
  } else {
    delete rawConfig.stages[stage].alternativeDomains;
  }

  const anyAltsLeft = Object.values(rawConfig.stages).some(st => (st.alternativeDomains?.length ?? 0) > 0);
  if (!anyAltsLeft && rawConfig.frontEndCertificateARN) {
    const clearArn =
      opts.yes ||
      (!nonInteractive &&
        unwrapPrompt(
          await confirm({
            message: 'No alternativeDomains remain. Clear frontEndCertificateARN and revert to CDK-managed certificates?',
            initialValue: true
          })
        ));
    if (clearArn) {
      delete rawConfig.frontEndCertificateARN;
    }
  }

  const writtenPath = writeMainConfig(config.rootDir, rawConfig);
  log.success(`Removed ${targetDomain} from ${path.relative(config.rootDir, writtenPath)}`);

  const awsOpts = {
    profile: opts.profile ?? config.aws.profile,
    region: opts.region ?? config.aws.region
  };
  const shouldDeploy =
    opts.deploy ||
    (!nonInteractive &&
      unwrapPrompt(
        await confirm({
          message: `Deploy "${stage}" back-end now to update CloudFront aliases?`,
          initialValue: true
        })
      ));
  if (shouldDeploy) {
    await runDeploy('backend', {
      stage,
      profile: awsOpts.profile,
      region: awsOpts.region,
      ci: opts.ci,
      yes: true
    });
  } else if (!nonInteractive) {
    outro('Configuration updated.');
  }
}

export async function runDomainMenu(opts: DomainCommandOptions): Promise<void> {
  if (isNonInteractive(opts.ci)) {
    await runDomainStatus(opts);
    return;
  }

  showBanner('Custom Domains');
  const action = unwrapPrompt(
    await select({
      message: 'Custom domain action:',
      options: [
        { value: 'add', label: 'Add custom domain', hint: 'request us-east-1 ACM cert & update config' },
        { value: 'status', label: 'Check domain & certificate status', hint: 'show ACM status & CNAME records' },
        { value: 'remove', label: 'Remove custom domain', hint: 'remove alternativeDomain from a stage' }
      ]
    })
  );

  if (action === 'add') await runDomainAdd(opts.domain, opts);
  else if (action === 'status') await runDomainStatus(opts);
  else if (action === 'remove') await runDomainRemove(opts.domain, opts);
}
