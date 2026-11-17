import { afterEach, describe, expect, it } from 'vitest';
import { buildAwsArgs, buildProfileArgs } from '../src/services/aws.js';

describe('aws helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('includes --profile when no static CI env credentials are set', () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_PROFILE;

    expect(buildProfileArgs('ga-app')).toEqual(['--profile', 'ga-app']);
    expect(buildProfileArgs(undefined)).toEqual([]);
  });

  it('omits --profile when static AWS env keys are set without AWS_PROFILE', () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIA_TEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET_TEST';
    delete process.env.AWS_PROFILE;

    expect(buildProfileArgs('ga-app')).toEqual([]);
  });

  it('builds aws args with profile and region', () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    expect(buildAwsArgs(['sts', 'get-caller-identity'], { profile: 'ga-app', region: 'eu-central-1' })).toEqual([
      'sts',
      'get-caller-identity',
      '--profile',
      'ga-app',
      '--region',
      'eu-central-1'
    ]);
  });
});
