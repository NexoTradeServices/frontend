// Feature 1014, brand strings go to config -- AC8 (unit, Vitest).
//
// AC8  the interim wording, and the literal "Perth Trades & Services", never
//      appear anywhere in frontend/src
//
// Moved out of frontend/e2e/brand-identity.spec.ts by
// project/setup/frontend-test-harness.md Part 1: this is a text search over
// source files, not a browser check -- the original opened a browser three
// times (once per Playwright viewport project) just to run this grep.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const INTERIM_WORDING = "Perth Trades & Services";

test("AC8: the interim wording appears nowhere in frontend/src", async () => {
  // Vitest's cwd is the frontend project root (where `npm run test:unit`
  // runs from), same as Playwright's testDir resolution did before the move.
  const srcDir = path.join(process.cwd(), "src");

  async function filesUnder(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await filesUnder(full)));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  }

  const files = await filesUnder(srcDir);
  const hits: string[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (content.includes(INTERIM_WORDING)) hits.push(path.relative(srcDir, file));
  }
  expect(hits).toEqual([]);
});
