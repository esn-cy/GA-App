import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  findRepoRoot,
  getStageOrThrow,
  resolveConfig,
  writeLocalOverride,
  writeMainConfig
} from '../src/services/config.js';
import type { GaAppConfig } from '../src/types.js';

const tmpDirs: string[] = [];

function makeTempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-cli-test-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'back-end'));
  fs.mkdirSync(path.join(dir, 'front-end'));
  return dir;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('config service', () => {
  it('resolves defaults and merges ga-app.local.json', () => {
    const dir = makeTempRepo();
    const base: GaAppConfig = {
      project: 'ga-app-test',
      domain: 'ga.example.org',
      aws: { profile: 'team-profile', region: 'eu-west-1' },
      stages: {
        prod: { domain: 'ga.example.org', destroyDataOnDelete: false },
        dev: { domain: 'dev.ga.example.org', destroyDataOnDelete: true, logLevel: 'DEBUG' }
      }
    };

    writeMainConfig(dir, base);
    writeLocalOverride(dir, { aws: { profile: 'personal-profile' } });

    const resolved = resolveConfig(dir);
    expect(resolved.project).toBe('ga-app-test');
    expect(resolved.aws.profile).toBe('personal-profile');
    expect(resolved.aws.region).toBe('eu-west-1');
    expect(resolved.hasLocalOverride).toBe(true);
    expect(resolved.domains).toEqual({
      api: 'api.ga.example.org',
      socket: 'socket.ga.example.org',
      media: 'media.ga.example.org'
    });
  });

  it('finds repo root from nested directory', () => {
    const dir = makeTempRepo();
    const nested = path.join(dir, 'front-end', 'src');
    fs.mkdirSync(nested, { recursive: true });
    expect(findRepoRoot(nested)).toBe(dir);
  });

  it('throws on unknown stage', () => {
    const dir = makeTempRepo();
    writeMainConfig(dir, {
      project: 'ga-app-test',
      domain: 'ga.example.org',
      stages: { dev: { domain: 'dev.ga.example.org', destroyDataOnDelete: true } }
    });
    const resolved = resolveConfig(dir);
    expect(() => getStageOrThrow(resolved, 'staging')).toThrow(/Unknown stage "staging"/);
  });

  it('rejects invalid config values', () => {
    const dir = makeTempRepo();
    writeMainConfig(dir, {
      project: 'INVALID_NAME',
      domain: 'notadomain',
      stages: {}
    });
    expect(() => resolveConfig(dir)).toThrow(/Invalid ga-app.config.json/);
  });

  it('rejects invalid stage logLevel', () => {
    const dir = makeTempRepo();
    writeMainConfig(dir, {
      project: 'ga-app-test',
      domain: 'ga.example.org',
      stages: {
        dev: {
          domain: 'dev.ga.example.org',
          destroyDataOnDelete: true,
          logLevel: 'VERBOSE' as never
        }
      }
    });
    expect(() => resolveConfig(dir)).toThrow(/stages\.dev\.logLevel/);
  });
});
