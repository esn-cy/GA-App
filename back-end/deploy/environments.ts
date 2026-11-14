/**
 * The codename of the project.
 */
export const PROJECT = 'ga-app-cyprus';
/**
 * The base domain to use.
 */
export const DOMAIN = 'ga.esncy.org';

export const parameters: Parameters = {
  project: PROJECT,
  hostedZoneDomain: DOMAIN,
  apiDomain: 'api.'.concat(DOMAIN),
  webSocketApiDomain: 'socket.'.concat(DOMAIN),
  mediaDomain: 'media.'.concat(DOMAIN)
};

export const stages: { [stage: string]: Stage } = {
  prod: {
    domain: DOMAIN,
    destroyDataOnDelete: false,
    logLevel: 'INFO'
  },
  dev: {
    domain: 'dev.'.concat(DOMAIN),
    destroyDataOnDelete: true,
    logLevel: 'DEBUG'
  }
};

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
