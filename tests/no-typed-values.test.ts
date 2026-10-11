// Feature 9001, AC10 -- no typed-in colour, text size or corner in the pages and components.
//
// Tokens (frontend-conventions): every colour, size, spacing and corner comes from
// globals.css by its token name. A hex, `white` or `black`, a pixel text size or a
// pixel corner typed into a component is the drift this test fails on. The tokens
// themselves (globals.css), the dev Texts sent page (`src/app/dev`) and the
// scaffold page at `/` (`src/app/page.tsx`) are outside the Page map and not swept.
// Rounded-md and rounded-lg are not corner tokens either: a button, field or banner
// is `rounded-button`, a small box `rounded-small-box`, a card `rounded-card`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx?|css)$/.test(name)) out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(SRC, file).split(path.sep).join("/");

const LEFT_OUT = ["app/globals.css", "app/page.tsx"];
const files = sourceFiles(SRC).filter((f) => !LEFT_OUT.includes(rel(f)) && !rel(f).startsWith("app/dev/"));

/** The code without its comments: a comment may name a value, a class may not. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{(,])\/\/.*$/gm, "$1");
}

function offenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of files) {
    const text = withoutComments(readFileSync(file, "utf8"));
    for (const match of text.matchAll(pattern)) found.push(`${rel(file)}: ${match[0]}`);
  }
  return found;
}

describe("AC10 -- nothing typed in", () => {
  test("the scan sees the app", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => rel(f) === "components/ui/message-card.tsx")).toBe(true);
  });

  test("no #hex colour", () => {
    expect(offenders(/(?<![&\w])#[0-9a-fA-F]{3,8}\b/g)).toEqual([]);
  });

  test("no white or black colour class", () => {
    expect(offenders(/\b(?:text|bg|border|ring|fill|stroke|from|to|via|divide|outline|shadow|decoration|accent|caret)-(?:white|black)\b/g)).toEqual([]);
  });

  test("no pixel text size", () => {
    expect(offenders(/\btext-\[[\d.]+px\]/g)).toEqual([]);
  });

  test("no pixel corner, and no rounded-md or rounded-lg", () => {
    expect(offenders(/\brounded-\[[\d.]+px\]/g)).toEqual([]);
    expect(offenders(/\brounded-(?:md|lg|xl|2xl)\b/g)).toEqual([]);
  });
});
