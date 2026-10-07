// Runs once before the first test -- Feature 9002. Clears whatever a crashed
// earlier run left behind, and warms the dev site's routes. Playwright's own
// workers start after this.
import { sweepE2eData, warmRoutes } from "./helpers/test-run";

export default async function globalSetup(): Promise<void> {
  await sweepE2eData();
  await warmRoutes();
}
