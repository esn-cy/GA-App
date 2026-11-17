import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/bin/ga-app.js';

describe('commander program', () => {
  it('registers setup, deploy, doctor, logs, and domain commands', () => {
    const program = createProgram();
    const names = program.commands.map(c => c.name());
    expect(names).toEqual(['setup', 'deploy', 'doctor', 'logs', 'domain']);
  });

  it('fails cleanly when domain add is called without domain in --ci mode', async () => {
    const program = createProgram();
    program.exitOverride();
    await expect(program.parseAsync(['node', 'ga-app', 'domain', 'add', '--ci'])).rejects.toThrow(
      /Custom domain is required/
    );
  });

  it('fails cleanly when deploy is called without target in --ci mode', async () => {
    const program = createProgram();
    program.exitOverride();
    await expect(program.parseAsync(['node', 'ga', 'deploy', '--ci'])).rejects.toThrow(
      /Missing deploy target/
    );
  });

  it('fails cleanly when setup --ci lacks required flags', async () => {
    const program = createProgram();
    program.exitOverride();
    await expect(program.parseAsync(['node', 'ga', 'setup', '--ci'])).rejects.toThrow(
      /--project and --domain are required/
    );
  });
});
