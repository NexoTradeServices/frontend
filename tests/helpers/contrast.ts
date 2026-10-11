// The colour readability check -- Feature 1018 (folded in from 1016).
//
// frontend-conventions / Tokens / Colours: every pair of a background and the
// text colour on it must reach 4.5 to 1 (WCAG AA, body text). While the
// colours are parked, the pairs that fall short today are listed with the
// ratio they have: any other pair under 4.5 fails, and a listed pair fails
// only if it is made fainter than its listed ratio.
export interface Pair {
  /** The text colour token and the background token it sits on. */
  text: string;
  on: string;
}

export interface Exception extends Pair {
  /** Today's ratio, to two decimals. */
  ratio: number;
}

export const MIN_RATIO = 4.5;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The ratio to two decimals, rounded down so a pair never reads better than it is. */
export function ratioOf(tokens: Map<string, string>, pair: Pair): number {
  const text = tokens.get(pair.text);
  const background = tokens.get(pair.on);
  if (text === undefined || background === undefined) {
    throw new Error(`pair ${pair.text} on ${pair.on}: a token is missing from globals.css`);
  }
  return Math.floor(contrastRatio(text, background) * 100) / 100;
}

/** Plain-words failures: a pair under 4.5 that is not listed, or a listed pair fainter than listed. */
export function checkPairs(tokens: Map<string, string>, pairs: readonly Pair[], exceptions: readonly Exception[]): string[] {
  const failures: string[] = [];
  for (const pair of pairs) {
    const ratio = ratioOf(tokens, pair);
    const listed = exceptions.find((e) => e.text === pair.text && e.on === pair.on);
    if (listed === undefined) {
      if (ratio < MIN_RATIO) failures.push(`${pair.text} on ${pair.on} is ${ratio.toFixed(2)} to 1, under ${MIN_RATIO}`);
    } else if (ratio < listed.ratio) {
      failures.push(`${pair.text} on ${pair.on} is ${ratio.toFixed(2)} to 1, fainter than its listed ${listed.ratio.toFixed(2)}`);
    }
  }
  return failures;
}
