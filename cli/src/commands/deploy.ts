import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import type { DeployTarget, ResolvedConfig } from '../types.js';
import { buildProfileArgs, findFrontEndDistributionFallback, getStackOutputs } from '../services/aws.js';
import { getStageOrThrow, resolveConfig } from '../services/config.js';
import { npmCmd, npxCmd, runCommand, runStreaming } from '../utils/exec.js';
import { confirm, isNonInteractive, log, outro, select, spinner, unwrapPrompt } from '../utils/prompt.js';
import { showBanner } from '../ui/banner.js';

export interface DeployOptions {
  stage?: string;
  profile?: string;
  region?: string;
  ci?: boolean;
  yes?: boolean;
  skipLint?: boolean;
  skipInstall?: boolean;
}

const VALID_TARGETS: readonly DeployTarget[] = ['backend', 'frontend', 'all', 'quick'];

async function ensureNodeModules(dir: string, skipInstall?: boolean): Promise<void> {
  if (skipInstall || fs.existsSync(path.join(dir, 'node_modules'))) return;
  log.step(`Installing dependencies in ${path.basename(dir)}...`);
  await runStreaming(npmCmd(), ['ci'], { cwd: dir });
}

function cdkEnv(region: string): NodeJS.ProcessEnv {
  return {
    CDK_DEFAULT_REGION: region,
    AWS_REGION: region,
    SRC_FOLDER: 'src/'
  };
}

async function deployBackend(
  config: ResolvedConfig,
  stage: string,
  awsOpts: { profile?: string; region: string },
  opts: DeployOptions
): Promise<void> {
  const backEndDir = path.join(config.rootDir, 'back-end');
  await ensureNodeModules(backEndDir, opts.skipInstall);

  if (!opts.skipLint) {
    log.step('Linting back-end...');
    await runStreaming(npmCmd(), ['run', 'lint'], { cwd: backEndDir });
  }

  log.step('Compiling back-end TypeScript...');
  await runStreaming(npmCmd(), ['run', 'compile'], { cwd: backEndDir });

  log.step(`Deploying CDK stacks for stage "${stage}"...`);
  const cdkArgs = [
    'run',
    'deploy',
    '--',
    '--context',
    `stage=${stage}`,
    '--all',
    '--require-approval',
    'never',
    ...buildProfileArgs(awsOpts.profile)
  ];
  await runStreaming(npmCmd(), cdkArgs, {
    cwd: backEndDir,
    env: cdkEnv(awsOpts.region)
  });
}

async function deployQuick(
  config: ResolvedConfig,
  stage: string,
  awsOpts: { profile?: string; region: string },
  opts: DeployOptions
): Promise<void> {
  const backEndDir = path.join(config.rootDir, 'back-end');
  await ensureNodeModules(backEndDir, opts.skipInstall);

  log.step('Compiling back-end TypeScript...');
  await runStreaming(npmCmd(), ['run', 'compile'], { cwd: backEndDir });

  const stackName = `${config.project}-${stage}-api`;
  log.step(`Hot swapping ${stackName}...`);
  const cdkArgs = [
    'run',
    'deploy',
    stackName,
    '--',
    '--context',
    `stage=${stage}`,
    '--exclusively',
    '--hotswap',
    ...buildProfileArgs(awsOpts.profile)
  ];
  await runStreaming(npmCmd(), cdkArgs, {
    cwd: backEndDir,
    env: cdkEnv(awsOpts.region)
  });
}

async function buildFrontendForStage(frontEndDir: string, stage: string): Promise<void> {
  if (stage === 'prod') {
    await runStreaming(npxCmd(), ['ng', 'build', '--configuration=production'], { cwd: frontEndDir });
    return;
  }
  if (stage === 'dev') {
    await runStreaming(npxCmd(), ['ng', 'build', '--configuration=production,dev'], { cwd: frontEndDir });
    return;
  }

  // Custom stage name: temporarily update environment.stage.ts and restore cleanly afterwards.
  const stageFile = path.join(frontEndDir, 'src', 'environments', 'environment.stage.ts');
  const original = fs.readFileSync(stageFile, 'utf8');
  try {
    fs.writeFileSync(stageFile, `export const STAGE = '${stage}';\n`, 'utf8');
    await runStreaming(npxCmd(), ['ng', 'build', '--configuration=production'], { cwd: frontEndDir });
  } finally {
    fs.writeFileSync(stageFile, original, 'utf8');
  }
}

async function deployFrontend(
  config: ResolvedConfig,
  stage: string,
  awsOpts: { profile?: string; region: string },
  opts: DeployOptions
): Promise<void> {
  const stageCfg = getStageOrThrow(config, stage);
  const frontEndDir = path.join(config.rootDir, 'front-end');
  await ensureNodeModules(frontEndDir, opts.skipInstall);

  if (!opts.skipLint) {
    log.step('Linting front-end...');
    await runStreaming(npmCmd(), ['run', 'lint'], { cwd: frontEndDir });
  }

  log.step(`Building front-end for stage "${stage}" (${stageCfg.domain})...`);
  await buildFrontendForStage(frontEndDir, stage);

  const s = spinner();
  s.start('Resolving S3 bucket and CloudFront distribution...');
  const stackName = `${config.project}-${stage}-front-end`;
  const stackOutputs = await getStackOutputs(stackName, awsOpts);

  let bucketName = stackOutputs?.S3BucketName;
  let distributionId = stackOutputs?.CloudFrontDistributionID;

  if (!bucketName || !distributionId) {
    const fallback = await findFrontEndDistributionFallback(stageCfg.domain, awsOpts);
    bucketName = bucketName ?? fallback?.bucketName;
    distributionId = distributionId ?? fallback?.distributionId;
  }

  if (!bucketName || !distributionId) {
    s.stop(pc.red('Failed to resolve S3 bucket or CloudFront distribution.'));
    throw new Error(
      `Could not find CloudFormation outputs for "${stackName}" or a CloudFront distribution matching "${stageCfg.domain}". Deploy the back-end first.`
    );
  }
  s.stop(`Target bucket: ${pc.cyan(bucketName)} · Distribution: ${pc.cyan(distributionId)}`);

  log.step(`Syncing ./www to s3://${bucketName}...`);
  const syncArgs = [
    's3',
    'sync',
    './www',
    `s3://${bucketName}`,
    '--delete',
    '--exclude',
    '.well-known/*',
    ...buildProfileArgs(awsOpts.profile),
    '--region',
    awsOpts.region
  ];
  await runStreaming('aws', syncArgs, { cwd: frontEndDir });

  log.step(`Invalidating CloudFront distribution ${distributionId}...`);
  const invArgs = [
    'cloudfront',
    'create-invalidation',
    '--distribution-id',
    distributionId,
    '--paths',
    '/*',
    ...buildProfileArgs(awsOpts.profile),
    '--region',
    awsOpts.region
  ];
  const invRes = await runCommand('aws', invArgs, { cwd: frontEndDir, stdio: 'pipe' });
  if (invRes.code !== 0) {
    throw new Error(invRes.stderr || invRes.stdout || 'CloudFront invalidation failed.');
  }
  log.success(`Front-end released to https://${stageCfg.domain}`);
}

export async function runDeploy(rawTarget: string | undefined, opts: DeployOptions): Promise<void> {
  const config = resolveConfig();
  const nonInteractive = isNonInteractive(opts.ci);
  const stageNames = Object.keys(config.stages);

  let target: DeployTarget;
  if (rawTarget) {
    if (!VALID_TARGETS.includes(rawTarget as DeployTarget)) {
      throw new Error(`Invalid target "${rawTarget}". Use one of: ${VALID_TARGETS.join(', ')}`);
    }
    target = rawTarget as DeployTarget;
  } else if (nonInteractive) {
    throw new Error(`Missing deploy target (${VALID_TARGETS.join(' | ')}) in non-interactive mode.`);
  } else {
    showBanner('Deploy');
    target = unwrapPrompt(
      await select<DeployTarget>({
        message: 'What would you like to deploy?',
        options: [
          { value: 'backend', label: 'Back-end (AWS CDK)', hint: 'lint, compile, cdk deploy --all' },
          { value: 'frontend', label: 'Front-end (Angular + S3 + CloudFront)', hint: 'lint, build, sync, invalidate' },
          { value: 'all', label: 'Full stack (Back-end + Front-end)', hint: 'deploy both in order' },
          { value: 'quick', label: 'Quick Lambda hotswap', hint: 'fast dev API update' }
        ]
      })
    );
  }

  if (rawTarget && !nonInteractive) {
    showBanner(`Deploy · ${target}`);
  }

  let resolvedStage: string;
  if (opts.stage) {
    resolvedStage = opts.stage;
  } else if (target === 'quick' && config.stages.dev && nonInteractive) {
    resolvedStage = 'dev';
  } else if (stageNames.length === 1) {
    resolvedStage = stageNames[0];
  } else if (nonInteractive) {
    throw new Error(`Missing --stage <name>. Available stages: ${stageNames.join(', ')}`);
  } else {
    resolvedStage = unwrapPrompt(
      await select({
        message: 'Target stage:',
        initialValue: target === 'quick' && config.stages.dev ? 'dev' : stageNames[0],
        options: stageNames.map(name => ({
          value: name,
          label: name,
          hint: config.stages[name].domain
        }))
      })
    );
  }

  const stageCfg = getStageOrThrow(config, resolvedStage);
  const awsOpts = {
    profile: opts.profile ?? config.aws.profile,
    region: opts.region ?? process.env.AWS_REGION ?? config.aws.region
  };

  if (!nonInteractive && !opts.yes && (resolvedStage === 'prod' || !stageCfg.destroyDataOnDelete)) {
    const confirmed = unwrapPrompt(
      await confirm({
        message:
          target === 'quick'
            ? `Hotswap production API stack "${config.project}-${resolvedStage}-api"? (Not recommended for production!)`
            : `Deploy ${pc.bold(target)} to ${pc.red(resolvedStage)} (${stageCfg.domain})?`,
        initialValue: target !== 'quick'
      })
    );
    if (!confirmed) {
      outro('Deployment cancelled.');
      return;
    }
  }

  log.info(
    `Project: ${pc.cyan(config.project)} · Stage: ${pc.cyan(resolvedStage)} · Region: ${pc.cyan(awsOpts.region)}${awsOpts.profile ? ` · Profile: ${pc.cyan(awsOpts.profile)}` : ''}`
  );

  if (target === 'quick') {
    await deployQuick(config, resolvedStage, awsOpts, opts);
  } else if (target === 'backend') {
    await deployBackend(config, resolvedStage, awsOpts, opts);
  } else if (target === 'frontend') {
    await deployFrontend(config, resolvedStage, awsOpts, opts);
  } else {
    await deployBackend(config, resolvedStage, awsOpts, opts);
    await deployFrontend(config, resolvedStage, awsOpts, opts);
  }

  if (!nonInteractive) {
    outro(pc.green(`Finished deploying ${target} (${resolvedStage}).`));
  }
}
