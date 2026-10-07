// Vitest config -- ADR 0001 (Playwright + Vitest). Unit tests that need no
// browser (project/setup/frontend-test-harness.md Part 1) -- Node
// environment, not jsdom: nothing here renders a component through a DOM.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The "@/..." imports the app itself uses (tsconfig paths), for the few tests that import a component (Feature 2006).
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "_scratch/**"],
  },
});
