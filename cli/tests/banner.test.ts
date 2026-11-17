import { describe, expect, it } from 'vitest';
import { renderLogoLines } from '../src/ui/banner.js';

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('banner logo', () => {
  it('renders 12 crisp half-block lines of width 24', () => {
    const lines = renderLogoLines(true);
    expect(lines).toHaveLength(12);
    for (const line of lines) {
      expect(stripAnsi(line)).toHaveLength(24);
    }
  });
});
