// A cross-FILE mutex for e2e writer tests that share one singleton server
// row -- discovered as a real, repeatable state-corruption race while
// measuring project/setup/frontend-test-harness.md Part 1.
//
// Playwright's own `test.describe.serial` only orders tests WITHIN one
// file/describe block; `fullyParallel` is still free to run two DIFFERENT
// spec files on separate workers at the same instant. brand-identity.spec.ts's
// AC6 and settings.spec.ts's AC1+3+5+6 both PUT the whole PlatformSettings
// object (settings-form.tsx sends the full form state, not a patch), each
// unaware the other exists -- whichever's Save lands last wins, so the
// other's edit (or its own end-of-test revert) can be silently clobbered.
//
// A plain lockfile: `mkdir` is atomic even across separate Node processes,
// so "the directory did not already exist" is a safe exclusive lock with no
// new dependency.
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const LOCK_DIR = path.join(process.cwd(), "test-results", ".platform-settings.lock");
const POLL_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs `fn` with exclusive access to the shared PlatformSettings row -- the
 * other writer waits its turn instead of racing this one's Save clicks. */
export async function withPlatformSettingsLock<T>(fn: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      await mkdir(LOCK_DIR);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      await sleep(POLL_MS);
    }
  }
  try {
    return await fn();
  } finally {
    await rm(LOCK_DIR, { recursive: true, force: true });
  }
}
