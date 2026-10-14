// Deterministic text measurement + wrapping for SVG labels.
// Widths are Helvetica/Arial advance widths (1/1000 em). The map's SVG font stack starts with
// Helvetica Neue / Helvetica / Arial so these metrics are representative; a safety factor covers
// fallbacks. Runtime overflow is additionally checked in Playwright with getComputedTextLength().

const W: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333,
  '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584,
  '>': 584, '?': 556, '@': 1015, '[': 278, ']': 278, _: 556, '|': 260,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556,
  M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667,
  Y: 667, Z: 611,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222,
  m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500,
  y: 500, z: 500,
  '‘': 222, '’': 222, '“': 333, '”': 333, '—': 1000, '–': 556, '→': 1000, '…': 1000, '×': 584,
  'é': 556, 'è': 556, 'ü': 556, '▲': 800, '▼': 800, '↻': 900, '·': 278,
};
const DIGIT = 556;
const DEFAULT = 620;
const SAFETY = 1.07;

export function textWidth(text: string, size: number, bold = false): number {
  let u = 0;
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') u += DIGIT;
    else u += W[ch] ?? DEFAULT;
  }
  return (u / 1000) * size * SAFETY * (bold ? 1.08 : 1);
}

export interface Wrapped {
  lines: string[];
  truncated: boolean;
}

/** Truncate a single line so it fits maxWidth, appending an ellipsis. */
export function ellipsize(text: string, maxWidth: number, size: number, bold = false): string {
  if (textWidth(text, size, bold) <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && textWidth(s.trimEnd() + '…', size, bold) > maxWidth) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

/**
 * Greedy word wrap into at most `maxLines` lines. Never rewrites text: lines are exact slices of
 * the input; when the text doesn't fit, the last line is visually truncated with an ellipsis.
 */
export function wrapText(text: string, maxWidth: number, size: number, maxLines: number, bold = false): Wrapped {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < words.length; i++) {
    const w = words[i];
    const candidate = cur ? cur + ' ' + w : w;
    if (textWidth(candidate, size, bold) <= maxWidth) {
      cur = candidate;
      continue;
    }
    if (cur) {
      lines.push(cur);
      cur = '';
      if (lines.length === maxLines) break;
      i--; // retry this word on the new line
      continue;
    }
    // single word longer than the line: hard-break it
    let part = w;
    while (part && textWidth(part, size, bold) > maxWidth) {
      let cut = part.length - 1;
      while (cut > 1 && textWidth(part.slice(0, cut), size, bold) > maxWidth) cut--;
      lines.push(part.slice(0, cut));
      part = part.slice(cut);
      if (lines.length === maxLines) break;
    }
    if (lines.length === maxLines) {
      i++;
      break;
    }
    cur = part;
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
    cur = '';
  }
  const truncated = i < words.length || cur !== '';
  if (truncated && lines.length) {
    const last = lines.length - 1;
    let s = lines[last];
    while (s.length > 0 && textWidth(s.trimEnd() + '…', size, bold) > maxWidth) s = s.slice(0, -1);
    lines[last] = s.trimEnd() + '…';
  }
  return { lines, truncated };
}
