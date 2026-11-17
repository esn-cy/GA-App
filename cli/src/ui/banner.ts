import pc from 'picocolors';
import { intro } from '@clack/prompts';

type ColorKey = 'G' | 'M' | 'O' | 'C';

const RGB: Record<ColorKey, readonly [number, number, number]> = {
  G: [122, 193, 67],  // ESN Green   (#7AC143)
  M: [236, 0, 140],   // ESN Magenta (#EC008C)
  O: [244, 123, 32],  // ESN Orange  (#F47B20)
  C: [0, 174, 239]    // ESN Cyan    (#00AEEF)
};

const LOGO_PIXELS = [
  '..........GGGG..........',
  '..........GGGG..........',
  '..........GGGG..........',
  '....CC....GGGG....MM....',
  '...CCCC...GGGG...MMMM...',
  '...CCCCC..GGGG..MMMMM...',
  '....CCCCC.GGGG.MMMMM....',
  '.....CCCCCGGGGMMMMM.....',
  '......CCCCCGGMMMMM......',
  '.......CCCCGGMMMM.......',
  'MMMMMMMMCC....MMOOOOOOOO',
  'MMMMMMMMMM....OOOOOOOOOO',
  'MMMMMMMMMM....OOOOOOOOOO',
  'MMMMMMMMOO....GGOOOOOOOO',
  '.......OOOOCCGGGG.......',
  '......OOOOOCCGGGGG......',
  '.....OOOOOCCCCGGGGG.....',
  '....OOOOO.CCCC.GGGGG....',
  '...OOOOO..CCCC..GGGGG...',
  '...OOOO...CCCC...GGGG...',
  '....OO....CCCC....GG....',
  '..........CCCC..........',
  '..........CCCC..........',
  '..........CCCC..........'
] as const;

function supportsTrueColor(): boolean {
  if (!pc.isColorSupported) return false;
  const ct = (process.env.COLORTERM ?? '').toLowerCase();
  return ct === 'truecolor' || ct === '24bit' || process.platform === 'darwin';
}

function fg(key: ColorKey, trueColor: boolean): string {
  if (!pc.isColorSupported) return '';
  if (trueColor) {
    const [r, g, b] = RGB[key];
    return `\x1b[38;2;${r};${g};${b}m`;
  }
  const codes: Record<ColorKey, string> = {
    G: '\x1b[92m',
    M: '\x1b[95m',
    O: '\x1b[33m',
    C: '\x1b[96m'
  };
  return codes[key];
}

function bg(key: ColorKey, trueColor: boolean): string {
  if (!pc.isColorSupported) return '';
  if (trueColor) {
    const [r, g, b] = RGB[key];
    return `\x1b[48;2;${r};${g};${b}m`;
  }
  const codes: Record<ColorKey, string> = {
    G: '\x1b[102m',
    M: '\x1b[105m',
    O: '\x1b[43m',
    C: '\x1b[106m'
  };
  return codes[key];
}

export function renderLogoLines(trueColor = supportsTrueColor()): string[] {
  const reset = pc.isColorSupported ? '\x1b[0m' : '';
  const lines: string[] = [];

  for (let y = 0; y < LOGO_PIXELS.length; y += 2) {
    const topRow = LOGO_PIXELS[y];
    const botRow = LOGO_PIXELS[y + 1] ?? '.'.repeat(topRow.length);
    let line = '';

    for (let x = 0; x < topRow.length; x++) {
      const t = topRow[x];
      const b = botRow[x];
      const top = t === '.' ? null : (t as ColorKey);
      const bot = b === '.' ? null : (b as ColorKey);

      if (!top && !bot) {
        line += ' ';
      } else if (top && bot) {
        if (top === bot) {
          line += `${fg(top, trueColor)}█${reset}`;
        } else {
          line += `${fg(top, trueColor)}${bg(bot, trueColor)}▀${reset}`;
        }
      } else if (top) {
        line += `${fg(top, trueColor)}▀${reset}`;
      } else if (bot) {
        line += `${fg(bot, trueColor)}▄${reset}`;
      }
    }

    lines.push(line);
  }

  return lines;
}

export function showBanner(subtitle?: string): void {
  console.log('');
  if ((process.stdout.columns ?? 80) >= LOGO_PIXELS[0].length + 2) {
    for (const line of renderLogoLines()) {
      console.log(`  ${line}`);
    }
    console.log('');
  }

  const title = pc.bold(pc.cyan('GA App CLI'));
  const tag = subtitle ? pc.dim(` · ${subtitle}`) : '';
  intro(`${title}${tag}`);
}
