import { spawn } from 'node:child_process';

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: 'inherit' | 'pipe';
}

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a command cross-platform without shell interpolation.
 * Uses `shell: process.platform === 'win32'` only for `.cmd` resolution on Windows.
 */
export function runCommand(cmd: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: { ...process.env, AWS_PAGER: '', ...options.env },
      stdio: options.stdio ?? 'pipe',
      shell: process.platform === 'win32'
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
    }
    if (child.stderr) {
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
    }

    child.on('error', err => reject(err));
    child.on('close', code => {
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

export async function runStreaming(cmd: string, args: string[], options: ExecOptions = {}): Promise<void> {
  const result = await runCommand(cmd, args, { ...options, stdio: 'inherit' });
  if (result.code !== 0) {
    throw new Error(`Command failed (${result.code}): ${cmd} ${args.join(' ')}`);
  }
}

export async function commandExists(cmd: string, versionArg = '--version'): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await runCommand(cmd, [versionArg], { stdio: 'pipe' });
    if (res.code === 0) {
      const firstLine = (res.stdout || res.stderr).split(/\r?\n/)[0]?.trim();
      return { ok: true, version: firstLine };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export function npmCmd(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

export function npxCmd(): string {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}
