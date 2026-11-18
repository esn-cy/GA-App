import pc from 'picocolors';
import {
  checkSsmParam,
  describeAcmCertificateUsEast1,
  findHostedZone,
  getCallerIdentity,
  getSesStatus,
  getStackStatus,
  isCdkBootstrapped
} from '../services/aws.js';
import { getStageOrThrow, resolveConfig } from '../services/config.js';
import { commandExists, npxCmd } from '../utils/exec.js';
import { log, outro, spinner } from '@clack/prompts';
import { showBanner } from '../ui/banner.js';
import { buildCertificateDomains, certCoversDomains } from './domain.js';

export interface DoctorOptions {
  stage?: string;
  profile?: string;
  region?: string;
  json?: boolean;
}

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

export async function runDoctor(opts: DoctorOptions): Promise<void> {
  const results: CheckResult[] = [];
  const config = resolveConfig();
  const stageNames = opts.stage ? [opts.stage] : Object.keys(config.stages);
  for (const s of stageNames) getStageOrThrow(config, s);

  const awsOpts = {
    profile: opts.profile ?? config.aws.profile,
    region: opts.region ?? config.aws.region
  };

  if (!opts.json) {
    showBanner('Doctor');
    log.info(
      `Checking project ${pc.cyan(config.project)} (${config.domain}) in ${pc.cyan(awsOpts.region)}${config.hasLocalOverride ? ' + ga-app.local.json' : ''}`
    );
  }

  results.push({
    name: 'Config',
    status: 'pass',
    detail: `Valid ${config.configPath}${config.hasLocalOverride ? ' (with local override)' : ''}`
  });

  const s = opts.json ? null : spinner();
  s?.start('Checking local tools...');
  const [nodeTool, awsTool, cdkTool] = await Promise.all([
    commandExists('node', '-v'),
    commandExists('aws', '--version'),
    commandExists(npxCmd(), 'cdk')
  ]);
  s?.stop('Local tools checked.');

  results.push({
    name: 'Node.js',
    status: nodeTool.ok ? 'pass' : 'fail',
    detail: nodeTool.ok ? (nodeTool.version ?? 'installed') : 'Not found'
  });
  results.push({
    name: 'AWS CLI',
    status: awsTool.ok ? 'pass' : 'fail',
    detail: awsTool.ok ? (awsTool.version ?? 'installed') : 'Not found'
  });
  results.push({
    name: 'AWS CDK',
    status: cdkTool.ok ? 'pass' : 'warn',
    detail: cdkTool.ok ? 'Available via npx cdk' : 'Not detected globally (will use back-end/node_modules)'
  });

  if (awsTool.ok) {
    const awsSpin = opts.json ? null : spinner();
    awsSpin?.start('Inspecting AWS account resources...');

    let awsReachable = false;
    try {
      const id = await getCallerIdentity(awsOpts);
      awsReachable = true;
      results.push({ name: 'AWS Credentials', status: 'pass', detail: `Account ${id.account} (${id.arn})` });
    } catch (err) {
      results.push({
        name: 'AWS Credentials',
        status: 'fail',
        detail: err instanceof Error ? err.message : 'Unable to authenticate with AWS'
      });
    }

    if (awsReachable) {
      const [bootstrapped, ssmOk, zone, ses] = await Promise.all([
        isCdkBootstrapped(awsOpts),
        checkSsmParam(`/${config.project}/auth`, awsOpts),
        findHostedZone(config.domain, awsOpts).catch(() => null),
        getSesStatus(awsOpts).catch(() => null)
      ]);

      results.push({
        name: 'CDK Bootstrap',
        status: bootstrapped ? 'pass' : 'fail',
        detail: bootstrapped
          ? `CDKToolkit stack active in ${awsOpts.region}`
          : `Not bootstrapped in ${awsOpts.region} (run "node cli setup" or "cdk bootstrap")`
      });

      results.push({
        name: 'SSM Auth Secret',
        status: ssmOk ? 'pass' : 'fail',
        detail: ssmOk
          ? `Parameter /${config.project}/auth exists`
          : `Missing /${config.project}/auth (run "node cli setup" to create it)`
      });

      results.push({
        name: 'Route 53 Hosted Zone',
        status: zone ? 'pass' : 'warn',
        detail: zone ? `Found ${zone.name} (${zone.id})` : `No hosted zone found for ${config.domain}`
      });

      if (ses) {
        results.push({
          name: 'Amazon SES',
          status: ses.productionAccess ? 'pass' : 'warn',
          detail: ses.productionAccess
            ? 'Production access enabled'
            : 'Sandbox mode — request SES production access before inviting members'
        });
      }

      for (const stage of stageNames) {
        const apiStatus = await getStackStatus(`${config.project}-${stage}-api`, awsOpts);
        const feStatus = await getStackStatus(`${config.project}-${stage}-front-end`, awsOpts);
        results.push({
          name: `Stacks (${stage})`,
          status: apiStatus && feStatus ? 'pass' : 'warn',
          detail: `api=${apiStatus ?? 'not deployed'}, front-end=${feStatus ?? 'not deployed'}`
        });
      }

      const allAlternativeDomains = stageNames.flatMap(s => config.stages[s].alternativeDomains ?? []);
      if (config.frontEndCertificateARN) {
        try {
          const cert = await describeAcmCertificateUsEast1(config.frontEndCertificateARN, awsOpts);
          const required = buildCertificateDomains(config);
          const coversAll = certCoversDomains(cert, required);
          if (cert.status === 'ISSUED' && coversAll) {
            results.push({
              name: 'Custom Domain ACM',
              status: 'pass',
              detail: `ISSUED in us-east-1 (${cert.certificateArn})`
            });
          } else if (cert.status === 'PENDING_VALIDATION') {
            results.push({
              name: 'Custom Domain ACM',
              status: 'warn',
              detail: `PENDING_VALIDATION in us-east-1 — run "ga-app domain status" to view CNAME records`
            });
          } else {
            results.push({
              name: 'Custom Domain ACM',
              status: 'fail',
              detail: !coversAll
                ? `Certificate does not cover all configured domains (${required.join(', ')})`
                : `Unexpected certificate status: ${cert.status}`
            });
          }
        } catch (err) {
          results.push({
            name: 'Custom Domain ACM',
            status: 'fail',
            detail: err instanceof Error ? err.message : 'Unable to describe frontEndCertificateARN in us-east-1'
          });
        }
      } else if (allAlternativeDomains.length > 0) {
        results.push({
          name: 'Custom Domain ACM',
          status: 'fail',
          detail: `alternativeDomains (${allAlternativeDomains.join(', ')}) configured without frontEndCertificateARN — run "ga-app domain add"`
        });
      }
    }

    awsSpin?.stop('AWS checks complete.');
  }

  const hasFailure = results.some(r => r.status === 'fail');

  if (opts.json) {
    console.log(JSON.stringify({ ok: !hasFailure, checks: results }, null, 2));
  } else {
    for (const r of results) {
      const line = `${pc.bold(r.name)}: ${r.detail}`;
      if (r.status === 'pass') log.success(line);
      else if (r.status === 'warn') log.warn(line);
      else log.error(line);
    }
    outro(hasFailure ? pc.red('Some required checks failed.') : pc.green('All required checks passed!'));
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}
