// Feature 1018, AC14 -- no page draws its own frame.
//
// Templates / Shells: a page never draws its own top bar, sidebar or footer
// and never imports a shell. Only the shell layout files and the frame
// pieces import the frame pieces or the Wordmark, or render a <header>. The
// Container is the one frame piece a page does import (it names its width),
// and the Page header is an organism every page draws.
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
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(SRC, file).split(path.sep).join("/");

/** Where frame code lives: the pieces, the Portal shell, and the layout files of the route groups. */
function isFrameCode(file: string): boolean {
  const r = rel(file);
  return r.startsWith("components/frame/") || r.startsWith("components/portal-shell/") || /^app\/.*layout\.tsx$/.test(r);
}

const FRAME_IMPORT =
  /from\s+["']@\/components\/(frame\/(?!container["'])[a-z-]+|portal-shell\/[a-z-]+|brand\/wordmark)["']/;

const files = sourceFiles(SRC);

describe("AC14 -- no page draws its own frame", () => {
  test("the scan sees the app", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => rel(f) === "app/(portal)/layout.tsx")).toBe(true);
  });

  test("only frame code imports a shell, Top bar, Sidebar, Footer or the Wordmark", () => {
    const offenders = files.filter((f) => !isFrameCode(f) && FRAME_IMPORT.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });

  test("only frame code renders a <header>", () => {
    const offenders = files.filter((f) => !isFrameCode(f) && /<header[\s>]/.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });

  test("each shell is one layout file, over its route group", () => {
    for (const group of ["(portal)", "(focused)", "(public)"]) {
      expect(files.some((f) => rel(f) === `app/${group}/layout.tsx`), `${group}/layout.tsx`).toBe(true);
    }
  });

  test("no page sets a width of its own: no max-w-[...] in a page file", () => {
    const pages = files.filter((f) => /\/app\/.*page\.tsx$/.test(f) && !rel(f).startsWith("app/dev/") && rel(f) !== "app/page.tsx");
    const offenders = pages.filter((f) => /max-w-\[\d+px\]/.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });
});
