import fs from 'node:fs';
import path from 'node:path';
import type { GaAppConfig, ResolvedConfig, StageConfig } from '../types.js';
import {
  LOG_LEVELS,
  validateDomain,
  validateProjectName,
  validateRegion,
  validateStageName
} from '../utils/validators.js';

export const CONFIG_FILENAME = 'ga-app.config.json';
export const LOCAL_CONFIG_FILENAME = 'ga-app.local.json';
export const DEFAULT_REGION = 'eu-central-1';

export function findRepoRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    const hasConfig = fs.existsSync(path.join(current, CONFIG_FILENAME));
    const hasDirs =
      fs.existsSync(path.join(current, 'back-end')) && fs.existsSync(path.join(current, 'front-end'));
    if (hasConfig || hasDirs) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not locate repository root (${CONFIG_FILENAME} or back-end/ + front-end/).`);
    }
    current = parent;
  }
}

export function mergeConfigs(base: GaAppConfig, local?: Partial<GaAppConfig>): GaAppConfig {
  if (!local) return base;
  return {
    ...base,
    ...local,
    aws: { ...base.aws, ...local.aws },
    domains: { ...base.domains, ...local.domains },
    stages: { ...base.stages, ...local.stages }
  };
}

export function validateConfig(raw: GaAppConfig): string[] {
  const errors: string[] = [];

  const projectErr = validateProjectName(raw.project ?? '');
  if (projectErr) errors.push(`project: ${projectErr}`);

  const domainErr = validateDomain(raw.domain ?? '');
  if (domainErr) errors.push(`domain: ${domainErr}`);

  if (raw.aws?.region) {
    const regionErr = validateRegion(raw.aws.region);
    if (regionErr) errors.push(`aws.region: ${regionErr}`);
  }

  if (!raw.stages || typeof raw.stages !== 'object' || Object.keys(raw.stages).length === 0) {
    errors.push('stages: at least one stage (e.g. dev, prod) is required.');
  } else {
    for (const [stageName, stage] of Object.entries(raw.stages)) {
      const stageErr = validateStageName(stageName);
      if (stageErr) errors.push(`stages.${stageName}: ${stageErr}`);
      const stageDomainErr = validateDomain(stage?.domain ?? '');
      if (stageDomainErr) errors.push(`stages.${stageName}.domain: ${stageDomainErr}`);
      if (stage?.hostedZoneDomain) {
        const hzErr = validateDomain(stage.hostedZoneDomain);
        if (hzErr) errors.push(`stages.${stageName}.hostedZoneDomain: ${hzErr}`);
      }
      if (stage?.alternativeDomains) {
        for (const alt of stage.alternativeDomains) {
          const altErr = validateDomain(alt);
          if (altErr) errors.push(`stages.${stageName}.alternativeDomains ("${alt}"): ${altErr}`);
        }
      }
      if (typeof stage?.destroyDataOnDelete !== 'boolean') {
        errors.push(`stages.${stageName}.destroyDataOnDelete: must be a boolean.`);
      }
      if (stage?.logLevel !== undefined && !LOG_LEVELS.includes(stage.logLevel)) {
        errors.push(`stages.${stageName}.logLevel: must be one of ${LOG_LEVELS.join(', ')}.`);
      }
    }
  }

  return errors;
}

export function resolveConfig(rootDir = findRepoRoot()): ResolvedConfig {
  const configPath = path.join(rootDir, CONFIG_FILENAME);
  const localConfigPath = path.join(rootDir, LOCAL_CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${CONFIG_FILENAME} at ${rootDir}. Run "node cli setup" (or "ga-app setup") to create it.`);
  }

  const base = JSON.parse(fs.readFileSync(configPath, 'utf8')) as GaAppConfig;
  const hasLocalOverride = fs.existsSync(localConfigPath);
  const local = hasLocalOverride
    ? (JSON.parse(fs.readFileSync(localConfigPath, 'utf8')) as Partial<GaAppConfig>)
    : undefined;

  const merged = mergeConfigs(base, local);
  const errors = validateConfig(merged);
  if (errors.length > 0) {
    throw new Error(`Invalid ${CONFIG_FILENAME}:\n  - ${errors.join('\n  - ')}`);
  }

  return {
    rootDir,
    configPath,
    localConfigPath,
    hasLocalOverride,
    project: merged.project,
    domain: merged.domain,
    aws: {
      profile: merged.aws?.profile || undefined,
      region: merged.aws?.region || DEFAULT_REGION
    },
    domains: {
      api: merged.domains?.api || `api.${merged.domain}`,
      socket: merged.domains?.socket || `socket.${merged.domain}`,
      media: merged.domains?.media || `media.${merged.domain}`
    },
    frontEndCertificateARN: merged.frontEndCertificateARN,
    stages: merged.stages
  };
}

export function tryLoadRawConfig(rootDir = findRepoRoot()): GaAppConfig | undefined {
  const configPath = path.join(rootDir, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) return undefined;
  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as GaAppConfig;
}

export function writeMainConfig(rootDir: string, config: GaAppConfig): string {
  const configPath = path.join(rootDir, CONFIG_FILENAME);
  const payload: GaAppConfig = {
    $schema: `./ga-app.config.schema.json`,
    ...config
  };
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return configPath;
}

export function writeLocalOverride(rootDir: string, local: Partial<GaAppConfig>): string {
  const localPath = path.join(rootDir, LOCAL_CONFIG_FILENAME);
  fs.writeFileSync(localPath, `${JSON.stringify(local, null, 2)}\n`, 'utf8');
  return localPath;
}

export function getStageOrThrow(config: ResolvedConfig, stageName: string): StageConfig {
  const stage = config.stages[stageName];
  if (!stage) {
    const available = Object.keys(config.stages).join(', ');
    throw new Error(`Unknown stage "${stageName}". Configured stages: ${available}`);
  }
  return stage;
}
