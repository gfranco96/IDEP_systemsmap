// Deterministic text measurement + wrapping for SVG labels.
// The map uses a monospace font stack (SF Mono / Menlo / Consolas …), whose advance width is ~0.6 em for
// every character. A safety factor covers font fallbacks for symbols (→ — “ ”).
// Runtime overflow is additionally checked in Playwright with getComputedTextLength().

const ADVANCE = 0.602;
const SAFETY = 1.04;

export function textWidth(text: string, size: number, _bold = false): number {
  let n = 0;
  for (const ch of text) n += ch === '→' || ch === '—' || ch === '…' ? 1.15 : 1;
  return n * ADVANCE * size * SAFETY;
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
