// Cross-FILE mutex for e2e tests that share server-side state no single
// file owns exclusively -- the PlatformSettings row, discovered as a real,
// repeatable race while measuring project/setup/frontend-test-harness.md Part 1.
//
// Playwright's own `test.describe.serial` only orders tests WITHIN one
// file/describe block; `fullyParallel` is still free to run two DIFFERENT
// spec files on separate workers at the same instant. A plain lockfile:
// `mkdir` is atomic even across separate Node processes, so "the directory
// did not already exist" is a safe exclusive lock with no new dependency.
//
// Reentrant within one worker process (a held-count per lock name, not just
// the directory's presence), so a test that holds the lock around its whole
// body may call a helper that takes it again without deadlocking. One worker
// only ever runs one test at a time, so "already held" unambiguously means
// "by an outer call in this same test", never a different test racing in.
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const POLL_MS = 200;
const heldCount = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const lockDir = path.join(process.cwd(), "test-results", name);
  const alreadyHeld = (heldCount.get(name) ?? 0) > 0;
  if (!alreadyHeld) {
    for (;;) {
      try {
        await mkdir(lockDir);
        break;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
        await sleep(POLL_MS);
      }
    }
  }
  heldCount.set(name, (heldCount.get(name) ?? 0) + 1);
  try {
    return await fn();
  } finally {
    const next = (heldCount.get(name) ?? 1) - 1;
    heldCount.set(name, next);
    if (next === 0) {
      await rm(lockDir, { recursive: true, force: true });
    }
  }
}

/** Runs `fn` with exclusive access to the shared PlatformSettings row -- the
 * other writer waits its turn instead of racing this one's Save clicks.
 * brand-identity.spec.ts's AC6 and settings.spec.ts's own writer test both
 * PUT the whole row (settings-form.tsx sends the full form state, not a
 * patch), each unaware the other exists. */
export const withPlatformSettingsLock = <T>(fn: () => Promise<T>): Promise<T> =>
  withLock(".platform-settings.lock", fn);
