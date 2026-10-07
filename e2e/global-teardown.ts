// Runs once after the last test -- Feature 9002. Clears what this run made.
import { sweepE2eData } from "./helpers/test-run";

export default async function globalTeardown(): Promise<void> {
  await sweepE2eData();
}
