import pc from 'picocolors';
import { buildProfileArgs, listApiLambdaFunctions, resolveApiLogGroup } from '../services/aws.js';
import { getStageOrThrow, resolveConfig } from '../services/config.js';
import { runStreaming } from '../utils/exec.js';
import { isNonInteractive, log, select, spinner, unwrapPrompt } from '../utils/prompt.js';
import { showBanner } from '../ui/banner.js';

export interface LogsOptions {
  stage?: string;
  function?: string;
  since?: string;
  follow?: boolean;
  filter?: string;
  profile?: string;
  region?: string;
}

export async function runLogs(opts: LogsOptions): Promise<void> {
  const config = resolveConfig();
  const nonInteractive = isNonInteractive(false);
  const stageNames = Object.keys(config.stages);

  if (!nonInteractive) {
    showBanner('CloudWatch Logs');
  }

  let resolvedStage: string;
  if (opts.stage) {
    resolvedStage = opts.stage;
  } else if (stageNames.length === 1) {
    resolvedStage = stageNames[0];
  } else if (nonInteractive) {
    resolvedStage = config.stages.dev ? 'dev' : stageNames[0];
  } else {
    resolvedStage = unwrapPrompt(
      await select({
        message: 'Select stage:',
        initialValue: config.stages.dev ? 'dev' : stageNames[0],
        options: stageNames.map(name => ({
          value: name,
          label: name,
          hint: config.stages[name].domain
        }))
      })
    );
  }

  getStageOrThrow(config, resolvedStage);
  const awsOpts = {
    profile: opts.profile ?? config.aws.profile,
    region: opts.region ?? config.aws.region
  };

  let fnName = opts.function;
  if (!fnName && !nonInteractive) {
    const s = spinner();
    s.start(`Loading Lambda functions for ${config.project}-${resolvedStage}-api...`);
    const functions = await listApiLambdaFunctions(config.project, resolvedStage, awsOpts);
    s.stop(functions.length > 0 ? `Found ${functions.length} functions.` : 'Using stack log group.');

    if (functions.length > 0) {
      const choice = unwrapPrompt(
        await select({
          message: 'Select log source:',
          options: [
            { value: '__all__', label: 'Shared API Log Group (all Lambda functions)' },
            ...functions.map(fn => ({ value: fn, label: fn }))
          ]
        })
      );
      if (choice !== '__all__') {
        fnName = choice;
      }
    }
  }

  const logGroup = await resolveApiLogGroup(config.project, resolvedStage, fnName, awsOpts);
  if (!logGroup) {
    throw new Error(`Could not resolve a CloudWatch log group for ${config.project}-${resolvedStage}-api.`);
  }

  const follow = opts.follow !== false;
  const since = opts.since ?? '30m';

  log.info(
    `Log group: ${pc.cyan(logGroup)} · Since: ${pc.cyan(since)}${follow ? pc.dim(' (Ctrl+C to stop)') : ''}`
  );

  const args = [
    'logs',
    'tail',
    logGroup,
    '--since',
    since,
    '--format',
    'short',
    ...(follow ? ['--follow'] : []),
    ...(opts.filter ? ['--filter-pattern', opts.filter] : []),
    ...buildProfileArgs(awsOpts.profile),
    '--region',
    awsOpts.region
  ];

  await runStreaming('aws', args, { cwd: config.rootDir });
}
