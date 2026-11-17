import { describe, expect, it } from 'vitest';
import { validateDomain, validateProjectName, validateRegion, validateStageName } from '../src/utils/validators.js';

describe('validators', () => {
  it('validates project names', () => {
    expect(validateProjectName('ga-app-cyprus')).toBeUndefined();
    expect(validateProjectName('esn123')).toBeUndefined();
    expect(validateProjectName('')).toBeDefined();
    expect(validateProjectName('GA-App')).toBeDefined();
    expect(validateProjectName('ga_app')).toBeDefined();
    expect(validateProjectName('-leading-dash')).toBeDefined();
  });

  it('validates domain names', () => {
    expect(validateDomain('ga.esncy.org')).toBeUndefined();
    expect(validateDomain('dev.ga.esncy.org')).toBeUndefined();
    expect(validateDomain('')).toBeDefined();
    expect(validateDomain('localhost')).toBeDefined();
    expect(validateDomain('https://ga.esncy.org')).toBeDefined();
  });

  it('validates AWS regions', () => {
    expect(validateRegion('eu-central-1')).toBeUndefined();
    expect(validateRegion('us-east-1')).toBeUndefined();
    expect(validateRegion('eu-north-1')).toBeUndefined();
    expect(validateRegion('')).toBeDefined();
    expect(validateRegion('europe')).toBeDefined();
  });

  it('validates stage names', () => {
    expect(validateStageName('dev')).toBeUndefined();
    expect(validateStageName('prod')).toBeUndefined();
    expect(validateStageName('staging-1')).toBeUndefined();
    expect(validateStageName('')).toBeDefined();
    expect(validateStageName('PROD')).toBeDefined();
  });
});
