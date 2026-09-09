// Cross-FILE mutexes for e2e tests that share server-side state no single
// file owns exclusively -- discovered as real, repeatable races while
// measuring project/setup/frontend-test-harness.md Part 1 (PlatformSettings)
// and its CI follow-up (Bob's own Contractor.status).
//
// Playwright's own `test.describe.serial` only orders tests WITHIN one
// file/describe block; `fullyParallel` is still free to run two DIFFERENT
// spec files on separate workers at the same instant. A plain lockfile:
// `mkdir` is atomic even across separate Node processes, so "the directory
// did not already exist" is a safe exclusive lock with no new dependency.
//
// Reentrant within one worker process (a held-count per lock name, not just
// the directory's presence): contractors.spec.ts's AC8+AC9 holds
// withContractorStatusLock around its whole body AND calls login() --
// itself wrapped in the same lock -- twice inside that body. A plain
// non-reentrant mutex would deadlock there (the outer call waiting on a
// directory only the outer call itself can remove). One worker only ever
// runs one test at a time, so "already held" unambiguously means "by an
// outer call in this same test", never a different test racing in.
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

/** Runs `fn` with exclusive access to a seeded contractor's own
 * Contractor.status. contractors.spec.ts's AC8+AC9 switches Bob off and on
 * again; the seven logins for a seeded contractor across four spec files
 * (helpers/login.ts wraps only those, not Mike's or the owner's) and
 * contractors.spec.ts's own AC1 (wraps its Active-tag read by hand) all
 * depend on him staying Active in the meantime. The app correctly refuses
 * a login or reads "Deactivated" when he genuinely is one -- without this,
 * a reader landing on that brief window fails for a reason unrelated to
 * what it is testing, passing or failing on timing alone. */
export const withContractorStatusLock = <T>(fn: () => Promise<T>): Promise<T> =>
  withLock(".contractor-status.lock", fn);
