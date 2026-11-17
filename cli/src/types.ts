export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface AwsConfig {
  profile?: string;
  region?: string;
}

export interface DomainsConfig {
  api?: string;
  socket?: string;
  media?: string;
}

export interface StageConfig {
  domain: string;
  hostedZoneDomain?: string;
  alternativeDomains?: string[];
  destroyDataOnDelete: boolean;
  logLevel?: LogLevel;
}

export interface GaAppConfig {
  $schema?: string;
  project: string;
  domain: string;
  aws?: AwsConfig;
  domains?: DomainsConfig;
  frontEndCertificateARN?: string;
  stages: Record<string, StageConfig>;
}

export interface ResolvedConfig {
  rootDir: string;
  configPath: string;
  localConfigPath: string;
  hasLocalOverride: boolean;
  project: string;
  domain: string;
  aws: {
    profile?: string;
    region: string;
  };
  domains: {
    api: string;
    socket: string;
    media: string;
  };
  frontEndCertificateARN?: string;
  stages: Record<string, StageConfig>;
}

export type DeployTarget = 'backend' | 'frontend' | 'all' | 'quick';
