import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import type { GaAppConfig } from '../types.js';
import {
  bootstrapCdk,
  checkSsmParam,
  getCallerIdentity,
  isCdkBootstrapped,
  listAwsProfiles,
  putSsmSecureParam
} from '../services/aws.js';
import {
  DEFAULT_REGION,
  findRepoRoot,
  tryLoadRawConfig,
  writeLocalOverride,
  writeMainConfig
} from '../services/config.js';
import { commandExists, npmCmd, runStreaming } from '../utils/exec.js';
import {
  confirm,
  isNonInteractive,
  log,
  note,
  outro,
  password,
  select,
  spinner,
  text,
  unwrapPrompt
} from '../utils/prompt.js';
import { showBanner } from '../ui/banner.js';
import { validateDomain, validateProjectName, validateRegion } from '../utils/validators.js';

export interface SetupOptions {
  ci?: boolean;
  project?: string;
  domain?: string;
  region?: string;
  profile?: string;
  localProfile?: boolean;
  devDomain?: string;
  prodDomain?: string;
  yes?: boolean;
}

export async function runSetup(opts: SetupOptions): Promise<void> {
  const rootDir = findRepoRoot();
  const existing = tryLoadRawConfig(rootDir);
  const nonInteractive = isNonInteractive(opts.ci);

  if (nonInteractive) {
    if (!opts.project || !opts.domain) {
      throw new Error('In --ci / non-interactive mode, --project and --domain are required.');
    }
    const projectErr = validateProjectName(opts.project);
    if (projectErr) throw new Error(projectErr);
    const domainErr = validateDomain(opts.domain);
    if (domainErr) throw new Error(domainErr);
    const region = opts.region ?? existing?.aws?.region ?? DEFAULT_REGION;
    const regionErr = validateRegion(region);
    if (regionErr) throw new Error(regionErr);

    const config: GaAppConfig = {
      project: opts.project.trim(),
      domain: opts.domain.trim(),
      aws: {
        ...(opts.profile && !opts.localProfile ? { profile: opts.profile } : {}),
        region
      },
      domains: {
        api: `api.${opts.domain.trim()}`,
        socket: `socket.${opts.domain.trim()}`,
        media: `media.${opts.domain.trim()}`
      },
      stages: {
        prod: {
          domain: opts.prodDomain?.trim() || opts.domain.trim(),
          destroyDataOnDelete: false,
          logLevel: 'INFO'
        },
        dev: {
          domain: opts.devDomain?.trim() || `dev.${opts.domain.trim()}`,
          destroyDataOnDelete: true,
          logLevel: 'DEBUG'
        }
      }
    };

    const written = writeMainConfig(rootDir, config);
    log.success(`Wrote ${path.relative(rootDir, written)}`);
    if (opts.profile && opts.localProfile) {
      const localPath = writeLocalOverride(rootDir, { aws: { profile: opts.profile } });
      log.success(`Wrote ${path.relative(rootDir, localPath)}`);
    }
    return;
  }

  showBanner('Setup Wizard');

  const toolSpin = spinner();
  toolSpin.start('Checking local prerequisites...');
  const [nodeCheck, awsCheck] = await Promise.all([commandExists('node', '-v'), commandExists('aws', '--version')]);
  toolSpin.stop('Prerequisite check complete.');

  log.info(`Node.js: ${nodeCheck.ok ? pc.green(nodeCheck.version ?? 'found') : pc.red('missing')}`);
  log.info(`AWS CLI: ${awsCheck.ok ? pc.green(awsCheck.version ?? 'found') : pc.yellow('not found (install for AWS provisioning)')}`);

  const project = unwrapPrompt(
    await text({
      message: 'Project codename (lowercase letters, numbers, dashes):',
      defaultValue: opts.project ?? existing?.project ?? 'ga-app-cyprus',
      validate: validateProjectName
    })
  ).trim();

  const domain = unwrapPrompt(
    await text({
      message: 'Base Route 53 Hosted Zone domain:',
      defaultValue: opts.domain ?? existing?.domain ?? 'ga.esncy.org',
      validate: validateDomain
    })
  ).trim();

  const customizeSubdomains = unwrapPrompt(
    await confirm({
      message: `Use default subdomains (api.${domain}, socket.${domain}, media.${domain})?`,
      initialValue: true
    })
  );

  let apiDomain = `api.${domain}`;
  let socketDomain = `socket.${domain}`;
  let mediaDomain = `media.${domain}`;

  if (!customizeSubdomains) {
    apiDomain = unwrapPrompt(
      await text({
        message: 'HTTP API domain:',
        defaultValue: existing?.domains?.api ?? apiDomain,
        validate: validateDomain
      })
    ).trim();
    socketDomain = unwrapPrompt(
      await text({
        message: 'WebSocket API domain:',
        defaultValue: existing?.domains?.socket ?? socketDomain,
        validate: validateDomain
      })
    ).trim();
    mediaDomain = unwrapPrompt(
      await text({
        message: 'Media CDN domain:',
        defaultValue: existing?.domains?.media ?? mediaDomain,
        validate: validateDomain
      })
    ).trim();
  }

  const regionChoice = unwrapPrompt(
    await select({
      message: 'Target AWS region:',
      initialValue: existing?.aws?.region ?? DEFAULT_REGION,
      options: [
        { value: 'eu-central-1', label: 'eu-central-1', hint: 'Frankfurt (recommended)' },
        { value: 'eu-west-1', label: 'eu-west-1', hint: 'Ireland' },
        { value: '__custom__', label: 'Other region...' }
      ]
    })
  );

  const region: string =
    regionChoice === '__custom__'
      ? unwrapPrompt(
        await text({
          message: 'Enter AWS region:',
          defaultValue: existing?.aws?.region ?? DEFAULT_REGION,
          validate: validateRegion
        })
      ).trim()
      : regionChoice;

  const profiles = awsCheck.ok ? await listAwsProfiles() : [];
  let selectedProfile = opts.profile ?? existing?.aws?.profile;

  if (profiles.length > 0) {
    const profileOptions = [
      ...profiles.map(p => ({ value: p, label: p })),
      { value: '__manual__', label: 'Enter a different profile name...' },
      { value: '__none__', label: 'None (use environment variables / default credentials)' }
    ];
    const choice = unwrapPrompt(
      await select({
        message: 'AWS CLI profile:',
        initialValue:
          selectedProfile && profiles.includes(selectedProfile) ? selectedProfile : profiles[0],
        options: profileOptions
      })
    );
    if (choice === '__none__') {
      selectedProfile = undefined;
    } else if (choice === '__manual__') {
      selectedProfile = unwrapPrompt(
        await text({
          message: 'AWS CLI profile name:',
          defaultValue: selectedProfile ?? 'ga-app'
        })
      ).trim() || undefined;
    } else {
      selectedProfile = choice;
    }
  } else {
    const manualProfile = unwrapPrompt(
      await text({
        message: 'AWS CLI profile name (leave blank to use default/env credentials):',
        defaultValue: selectedProfile ?? 'ga-app'
      })
    ).trim();
    selectedProfile = manualProfile || undefined;
  }

  let storeProfileLocally = false;
  if (selectedProfile) {
    const profileLocation = unwrapPrompt(
      await select({
        message: `Where should aws.profile ("${selectedProfile}") be saved?`,
        options: [
          {
            value: 'main',
            label: 'ga-app.config.json (committed)',
            hint: 'shared team default'
          },
          {
            value: 'local',
            label: 'ga-app.local.json (gitignored)',
            hint: 'personal override only'
          }
        ]
      })
    );
    storeProfileLocally = profileLocation === 'local';
  }

  const prodDomain = unwrapPrompt(
    await text({
      message: 'Production front-end domain:',
      defaultValue: existing?.stages?.prod?.domain ?? domain,
      validate: validateDomain
    })
  ).trim();

  const includeDev = unwrapPrompt(
    await confirm({
      message: 'Configure a "dev" stage alongside "prod"?',
      initialValue: true
    })
  );

  const stages: GaAppConfig['stages'] = {
    prod: {
      domain: prodDomain,
      destroyDataOnDelete: false,
      logLevel: existing?.stages?.prod?.logLevel ?? 'INFO'
    }
  };

  if (includeDev) {
    const devDomain = unwrapPrompt(
      await text({
        message: 'Development front-end domain:',
        defaultValue: existing?.stages?.dev?.domain ?? `dev.${domain}`,
        validate: validateDomain
      })
    ).trim();
    stages.dev = {
      domain: devDomain,
      destroyDataOnDelete: true,
      logLevel: existing?.stages?.dev?.logLevel ?? 'DEBUG'
    };
  }

  const config: GaAppConfig = {
    project,
    domain,
    aws: {
      ...(!storeProfileLocally && selectedProfile ? { profile: selectedProfile } : {}),
      region
    },
    domains: {
      api: apiDomain,
      socket: socketDomain,
      media: mediaDomain
    },
    ...(existing?.frontEndCertificateARN
      ? { frontEndCertificateARN: existing.frontEndCertificateARN }
      : {}),
    stages
  };

  const writtenConfigPath = writeMainConfig(rootDir, config);
  log.success(`Saved ${path.relative(rootDir, writtenConfigPath)}`);

  if (storeProfileLocally && selectedProfile) {
    const localPath = writeLocalOverride(rootDir, { aws: { profile: selectedProfile } });
    log.success(`Saved ${path.relative(rootDir, localPath)} (gitignored)`);
  }

  // Optional dependency installation
  const backEndDir = path.join(rootDir, 'back-end');
  const frontEndDir = path.join(rootDir, 'front-end');
  if (!fs.existsSync(path.join(backEndDir, 'node_modules')) || !fs.existsSync(path.join(frontEndDir, 'node_modules'))) {
    const installDeps = unwrapPrompt(
      await confirm({
        message: 'Install npm dependencies for back-end and front-end now?',
        initialValue: true
      })
    );
    if (installDeps) {
      if (!fs.existsSync(path.join(backEndDir, 'node_modules'))) {
        log.step('Installing back-end dependencies...');
        await runStreaming(npmCmd(), ['ci'], { cwd: backEndDir });
      }
      if (!fs.existsSync(path.join(frontEndDir, 'node_modules'))) {
        log.step('Installing front-end dependencies...');
        await runStreaming(npmCmd(), ['ci'], { cwd: frontEndDir });
      }
    }
  }

  // Optional AWS provisioning (CDK bootstrap + SSM auth secret)
  if (awsCheck.ok) {
    const checkAws = unwrapPrompt(
      await confirm({
        message: 'Verify AWS credentials, CDK bootstrap, and SSM auth secret now?',
        initialValue: true
      })
    );

    if (checkAws) {
      const awsOpts = { profile: selectedProfile, region };
      const s = spinner();
      s.start('Checking AWS identity...');
      try {
        const identity = await getCallerIdentity(awsOpts);
        s.stop(`AWS Account: ${pc.cyan(identity.account)} (${identity.arn})`);

        const bootstrapped = await isCdkBootstrapped(awsOpts);
        if (bootstrapped) {
          log.success(`CDK already bootstrapped in ${region}.`);
        } else {
          const doBootstrap = unwrapPrompt(
            await confirm({
              message: `CDK is not bootstrapped in aws://${identity.account}/${region}. Bootstrap now?`,
              initialValue: true
            })
          );
          if (doBootstrap) {
            log.step('Running CDK bootstrap...');
            await bootstrapCdk(backEndDir, identity.account, region, selectedProfile);
            log.success('CDK bootstrap completed.');
          }
        }

        const paramName = `/${project}/auth`;
        const hasParam = await checkSsmParam(paramName, awsOpts);
        if (hasParam) {
          log.success(`SSM parameter ${paramName} already exists.`);
        } else {
          const createParam = unwrapPrompt(
            await confirm({
              message: `SSM SecureString ${paramName} is missing. Create it now?`,
              initialValue: true
            })
          );
          if (createParam) {
            const secretMode = unwrapPrompt(
              await select({
                message: 'How should the auth signing secret be provided?',
                options: [
                  { value: 'generate', label: 'Auto-generate a secure random secret (recommended)' },
                  { value: 'manual', label: 'Enter a custom secret manually' }
                ]
              })
            );
            const secretValue =
              secretMode === 'generate'
                ? crypto.randomBytes(32).toString('hex')
                : unwrapPrompt(
                  await password({
                    message: 'Enter auth secret:',
                    validate: v => (!v || v.length < 16 ? 'Secret should be at least 16 characters.' : undefined)
                  })
                );
            await putSsmSecureParam(paramName, secretValue, awsOpts);
            log.success(`Created SSM SecureString ${paramName}.`);
          }
        }
      } catch (err) {
        s.stop(pc.yellow('Could not connect to AWS with those credentials.'));
        log.warn(err instanceof Error ? err.message : String(err));
      }
    }
  }

  const linkGlobal = unwrapPrompt(
    await confirm({
      message: 'Link "ga-app" globally (npm link) so you can run `ga-app` from anywhere?',
      initialValue: true
    })
  );
  let linkedGlobally = false;
  if (linkGlobal) {
    try {
      await runStreaming(npmCmd(), ['link'], { cwd: path.join(rootDir, 'cli') });
      linkedGlobally = true;
    } catch {
      log.warn('Could not run `npm link` (permission or PATH issue). You can still run `node cli`.');
    }
  }

  const cmdPrefix = linkedGlobally ? 'ga-app' : 'node cli';
  note(
    [
      `1. Run ${pc.cyan(`${cmdPrefix} doctor`)} to verify Route 53, CDK, SSM, and SES.`,
      `2. Deploy back-end: ${pc.cyan(`${cmdPrefix} deploy backend --stage ${includeDev ? 'dev' : 'prod'}`)}`,
      `3. Release front-end: ${pc.cyan(`${cmdPrefix} deploy frontend --stage ${includeDev ? 'dev' : 'prod'}`)}`
    ].join('\n'),
    'Next steps'
  );
  outro('Setup complete!');
}
