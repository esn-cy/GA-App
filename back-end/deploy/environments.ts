import * as fs from 'fs';
import * as path from 'path';

interface RawConfig {
  project: string;
  domain: string;
  aws?: {
    profile?: string;
    region?: string;
  };
  domains?: {
    api?: string;
    socket?: string;
    media?: string;
  };
  frontEndCertificateARN?: string;
  stages: { [stage: string]: Stage };
}

function readJsonFile(filePath: string): Partial<RawConfig> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<RawConfig>;
}

function loadConfig(): RawConfig {
  const rootDir = path.resolve(__dirname, '../..');
  const basePath = path.join(rootDir, 'ga-app.config.json');
  const localPath = path.join(rootDir, 'ga-app.local.json');

  if (!fs.existsSync(basePath)) {
    throw new Error(`Missing centralized config file at ${basePath}. Run the setup CLI first.`);
  }

  const base = readJsonFile(basePath) as RawConfig;
  if (!fs.existsSync(localPath)) {
    return base;
  }

  const local = readJsonFile(localPath);
  return {
    ...base,
    ...local,
    aws: { ...base.aws, ...local.aws },
    domains: { ...base.domains, ...local.domains },
    stages: { ...base.stages, ...local.stages }
  };
}

const config = loadConfig();

/**
 * The codename of the project.
 */
export const PROJECT = config.project;
/**
 * The base domain to use.
 */
export const DOMAIN = config.domain;

export const parameters: Parameters = {
  project: PROJECT,
  hostedZoneDomain: DOMAIN,
  apiDomain: config.domains?.api ?? 'api.'.concat(DOMAIN),
  webSocketApiDomain: config.domains?.socket ?? 'socket.'.concat(DOMAIN),
  mediaDomain: config.domains?.media ?? 'media.'.concat(DOMAIN),
  frontEndCertificateARN: config.frontEndCertificateARN
};

export const stages: { [stage: string]: Stage } = config.stages;

export interface Parameters {
  /**
   * Project key (unique to the AWS account).
   */
  project: string;
  /**
   * The base Route 53 hosted zone domain name.
   */
  hostedZoneDomain: string;
  /**
   * HTTP API for each environment will be available at `${apiDomain}/${env.stage}`.
   */
  apiDomain: string;
  /**
   * WebSocket API for each environment will be available at `${apiDomain}/${env.stage}`.
   */
  webSocketApiDomain: string;
  /**
   * The domain name where to reach the front-end's media files.
   */
  mediaDomain: string;
  /**
   * The custom front-end certificate ARN to use, to support alternative domains.
   */
  frontEndCertificateARN?: string;
}

export interface Stage {
  /**
   * The domain name where to reach the front-end.
   */
  domain: string;
  /**
   * Optional custom hosted zone domain if different from parameters.hostedZoneDomain.
   */
  hostedZoneDomain?: string;
  /**
   * The (optional) alternative domain names to reach the front-end.
   */
  alternativeDomains?: string[];
  /**
   * Whether to delete the data when the environment is deleted.
   * It should be True for dev and False for prod environments.
   */
  destroyDataOnDelete: boolean;
  /**
   * The minimum level of log to print in functions (default: `INFO`).
   */
  logLevel?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
}
