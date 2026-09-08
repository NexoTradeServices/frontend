// Vitest config -- ADR 0001 (Playwright + Vitest). Unit tests that need no
// browser (project/setup/frontend-test-harness.md Part 1) -- Node
// environment, not jsdom: nothing here renders a component through a DOM.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
