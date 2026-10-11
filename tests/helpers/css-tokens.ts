// Reads src/app/globals.css for the token tests (Feature 1018).
//
// The tokens live in ONE `:root` block of colour values (the first :root
// block of globals.css). Everything else in the file points at them with
// var(). Read as text -- no CSS parser -- because the file's shape is the
// thing under test.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const GLOBALS_CSS_PATH = fileURLToPath(new URL("../../src/app/globals.css", import.meta.url));

export function readGlobalsCss(): string {
  return readFileSync(GLOBALS_CSS_PATH, "utf8");
}

/** One map per `selector {` block, in file order: every `--name: value;` inside its braces. */
export function blocksOf(css: string, selector: string): Map<string, string>[] {
  const blocks: Map<string, string>[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf(`${selector} {`, from);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    let depth = 0;
    let end = open;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, "");
    const block = new Map<string, string>();
    for (const match of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      block.set(match[1] as string, (match[2] as string).trim());
    }
    blocks.push(block);
    from = end + 1;
  }
  return blocks;
}

/** The colour tokens: the first :root block, name without the leading dashes. */
export function colourTokens(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, value] of blocksOf(css, ":root")[0] ?? []) {
    if (/^#[0-9a-f]{6}$/i.test(value)) out.set(name.slice(2), value.toLowerCase());
  }
  return out;
}
