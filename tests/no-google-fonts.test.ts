// Feature 9004, fonts bundled -- AC2 (unit, Vitest).
//
// AC2  no source file imports next/font/google (decision 0007: the font files
//      live in frontend/src/fonts/ and load through next/font/local)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

test("AC2: nothing in frontend/src imports next/font/google", async () => {
  const srcDir = path.join(process.cwd(), "src");

  async function filesUnder(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await filesUnder(full)));
      else if (/\.(ts|tsx|js|jsx|mjs|css)$/.test(entry.name)) files.push(full);
    }
    return files;
  }

  const offenders: string[] = [];
  for (const file of await filesUnder(srcDir)) {
    if ((await readFile(file, "utf8")).includes("next/font/google")) {
      offenders.push(path.relative(process.cwd(), file));
    }
  }
  expect(offenders).toEqual([]);
});
