import { describe, expect, it } from 'vitest';
import { buildCertificateDomains, certCoversDomains, domainMatchesPattern } from '../src/commands/domain.js';
import type { AcmCertificateDetail } from '../src/services/aws.js';
import type { ResolvedConfig } from '../src/types.js';

const baseConfig: ResolvedConfig = {
  rootDir: '/tmp/repo',
  configPath: '/tmp/repo/ga-app.config.json',
  localConfigPath: '/tmp/repo/ga-app.local.json',
  hasLocalOverride: false,
  project: 'ga-app-test',
  domain: 'ga.esncy.org',
  aws: { region: 'eu-central-1' },
  domains: {
    api: 'api.ga.esncy.org',
    socket: 'socket.ga.esncy.org',
    media: 'media.ga.esncy.org'
  },
  stages: {
    prod: { domain: 'ga.esncy.org', destroyDataOnDelete: false },
    dev: { domain: 'dev.ga.esncy.org', destroyDataOnDelete: true }
  }
};

describe('domain command helpers', () => {
  it('matches exact and single-level wildcard patterns', () => {
    expect(domainMatchesPattern('ga.esncy.org', 'ga.esncy.org')).toBe(true);
    expect(domainMatchesPattern('dev.ga.esncy.org', '*.ga.esncy.org')).toBe(true);
    expect(domainMatchesPattern('a.b.ga.esncy.org', '*.ga.esncy.org')).toBe(false);
    expect(domainMatchesPattern('assembly.esn.it', '*.ga.esncy.org')).toBe(false);
  });

  it('builds deduplicated SAN list including base, wildcard, and custom domains', () => {
    const domains = buildCertificateDomains(baseConfig, ['assembly.esn.it']);
    expect(domains).toEqual(['ga.esncy.org', '*.ga.esncy.org', 'assembly.esn.it']);
  });

  it('detects whether an existing certificate covers all required domains', () => {
    const cert: AcmCertificateDetail = {
      certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc',
      domainName: 'ga.esncy.org',
      subjectAlternativeNames: ['ga.esncy.org', '*.ga.esncy.org', 'assembly.esn.it'],
      status: 'ISSUED',
      validationOptions: []
    };

    expect(certCoversDomains(cert, ['ga.esncy.org', 'dev.ga.esncy.org', 'assembly.esn.it'])).toBe(true);
    expect(certCoversDomains(cert, ['ga.esncy.org', 'other.esn.org'])).toBe(false);
  });
});
