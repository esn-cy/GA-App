import type { LogLevel } from '../types.js';

const PROJECT_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const REGION_RE = /^[a-z]{2}(?:-[a-z]+)+-\d+$/;
const STAGE_RE = /^[a-z0-9][a-z0-9-]*$/;

export const LOG_LEVELS: readonly LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

export function validateProjectName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Project codename is required.';
  if (!PROJECT_RE.test(trimmed)) {
    return 'Use only lowercase letters, numbers, and dashes (e.g. ga-app-cyprus).';
  }
  return undefined;
}

export function validateDomain(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Domain is required.';
  if (!DOMAIN_RE.test(trimmed)) {
    return 'Enter a valid domain name (e.g. ga.esncy.org).';
  }
  return undefined;
}

export function validateRegion(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'AWS region is required.';
  if (!REGION_RE.test(trimmed)) {
    return 'Enter a valid AWS region (e.g. eu-central-1).';
  }
  return undefined;
}

export function validateStageName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Stage name is required.';
  if (!STAGE_RE.test(trimmed)) {
    return 'Use only lowercase letters, numbers, and dashes.';
  }
  return undefined;
}
