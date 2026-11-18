#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import pc from 'picocolors';
import { runDeploy } from '../commands/deploy.js';
import { runDoctor } from '../commands/doctor.js';
import { runDomainAdd, runDomainMenu, runDomainRemove, runDomainStatus } from '../commands/domain.js';
import { runLogs } from '../commands/logs.js';
import { runSetup } from '../commands/setup.js';
import { showBanner } from '../ui/banner.js';
import { isNonInteractive, log, select, unwrapPrompt } from '../utils/prompt.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('ga-app')
    .description('GA-App deployment, setup, diagnostics, and logs CLI')
    .version('1.0.1');

  program
    .command('setup')
    .description('Interactive setup wizard for ga-app.config.json, CDK bootstrap, and SSM auth secret')
    .option('--ci', 'Run non-interactively (requires --project and --domain)')
    .option('--project <name>', 'Project codename (lowercase letters, numbers, dashes)')
    .option('--domain <domain>', 'Base Route 53 Hosted Zone domain')
    .option('--custom-domain <domain>', 'Optional custom production domain alias (alternativeDomains)')
    .option('--region <region>', 'Target AWS region (default: eu-central-1)')
    .option('--profile <profile>', 'AWS CLI profile name')
    .option('--local-profile', 'Save aws.profile in gitignored ga-app.local.json instead of ga-app.config.json')
    .option('--dev-domain <domain>', 'Development front-end domain')
    .option('--prod-domain <domain>', 'Production front-end domain')
    .action(async opts => {
      await runSetup(opts);
    });

  program
    .command('deploy')
    .description('Deploy back-end, front-end, all, or quick Lambda hotswap')
    .argument('[target]', 'Deployment target: backend | frontend | all | quick')
    .option('-s, --stage <stage>', 'Target stage name (e.g. dev, prod)')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .option('--ci', 'Non-interactive mode (fail on missing arguments, skip prompts)')
    .option('-y, --yes', 'Skip confirmation prompts (e.g. for prod)')
    .option('--skip-lint', 'Skip ESLint step')
    .option('--skip-install', 'Skip automatic npm ci if node_modules is missing')
    .action(async (target, opts) => {
      await runDeploy(target, opts);
    });

  program
    .command('doctor')
    .description('Verify local tools, config, AWS credentials, Route 53, CDK bootstrap, SSM, and SES')
    .option('-s, --stage <stage>', 'Check stacks for a specific stage')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .option('--json', 'Output machine-readable JSON')
    .action(async opts => {
      await runDoctor(opts);
    });

  program
    .command('logs')
    .description('Tail or inspect CloudWatch logs for deployed API Lambda functions')
    .option('-s, --stage <stage>', 'Target stage (e.g. dev, prod)')
    .option('-f, --function <name>', 'Lambda handler name (e.g. login, topics)')
    .option('--since <duration>', 'Start time offset (default: 30m)', '30m')
    .option('--no-follow', 'Print recent logs and exit without tailing')
    .option('--filter <pattern>', 'CloudWatch Logs filter pattern')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .action(async opts => {
      await runLogs(opts);
    });

  const domainCmd = program
    .command('domain')
    .description('Manage custom (alternative) front-end domains and us-east-1 ACM certificates')
    .option('-s, --stage <stage>', 'Target stage (default: prod)')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .option('--ci', 'Non-interactive mode')
    .action(async opts => {
      await runDomainMenu(opts);
    });

  domainCmd
    .command('add')
    .description('Add a custom domain, request/reuse a us-east-1 ACM certificate, and print/apply DNS records')
    .argument('[domain]', 'Custom domain name (e.g. assembly.esn.it)')
    .option('-s, --stage <stage>', 'Target stage (default: prod)')
    .option('-d, --domain <domain>', 'Custom domain name')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .option('--wait', 'Wait until ACM certificate status becomes ISSUED')
    .option('--deploy', 'Automatically deploy back-end once certificate is ISSUED')
    .option('--ci', 'Non-interactive mode')
    .option('-y, --yes', 'Auto-approve Route 53 validation record creation')
    .action(async (domain, opts) => {
      await runDomainAdd(domain, opts);
    });

  domainCmd
    .command('status')
    .description('Show configured alternativeDomains, CloudFront CNAME targets, and ACM certificate status')
    .option('-s, --stage <stage>', 'Stage to inspect')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .option('--ci', 'Non-interactive mode')
    .action(async opts => {
      await runDomainStatus(opts);
    });

  domainCmd
    .command('remove')
    .description('Remove a custom domain from a stage in ga-app.config.json')
    .argument('[domain]', 'Custom domain name to remove')
    .option('-s, --stage <stage>', 'Target stage (default: prod)')
    .option('-d, --domain <domain>', 'Custom domain name to remove')
    .option('-p, --profile <profile>', 'Override AWS CLI profile')
    .option('-r, --region <region>', 'Override AWS region')
    .option('--deploy', 'Automatically deploy back-end after removal')
    .option('--ci', 'Non-interactive mode')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (domain, opts) => {
      await runDomainRemove(domain, opts);
    });

  program.action(async () => {
    if (isNonInteractive(false)) {
      program.outputHelp();
      return;
    }

    showBanner('Interactive Menu');
    const action = unwrapPrompt(
      await select({
        message: 'Choose an action:',
        options: [
          { value: 'deploy', label: 'Deploy', hint: 'deploy back-end, front-end, or quick hotswap' },
          { value: 'setup', label: 'Setup wizard', hint: 'configure ga-app.config.json & AWS prerequisites' },
          { value: 'domain', label: 'Custom domains', hint: 'configure alternative domains & ACM certs' },
          { value: 'doctor', label: 'Doctor', hint: 'verify AWS credentials, DNS, CDK, SSM, SES' },
          { value: 'logs', label: 'Logs', hint: 'tail CloudWatch API logs' }
        ]
      })
    );

    if (action === 'deploy') await runDeploy(undefined, {});
    else if (action === 'setup') await runSetup({});
    else if (action === 'domain') await runDomainMenu({});
    else if (action === 'doctor') await runDoctor({});
    else if (action === 'logs') await runLogs({});
  });

  return program;
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const selfPath = fileURLToPath(import.meta.url);
  try {
    if (fs.realpathSync(entry) === fs.realpathSync(selfPath)) return true;
    const pkgMain = fs.realpathSync(`${entry}/dist/bin/ga-app.js`);
    if (pkgMain === fs.realpathSync(selfPath)) return true;
  } catch {
    // Ignore unresolved paths (e.g. test runner entrypoint)
  }
  return false;
}

if (isExecutedDirectly()) {
  createProgram()
    .parseAsync(process.argv)
    .catch(err => {
      log.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    });
}
