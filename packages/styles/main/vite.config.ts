import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The contract test runs in a real browser. `@layer` and `@scope` are cascade
 * structure, and the only honest parser of cascade structure is the CSSOM of an
 * engine that implements it: a regular expression over the text would answer a
 * different question. Chromium is Playwright's pinned build, the same one CI
 * installs for every project tagged `playwright`; this package's `playwright`
 * range must stay equal to the one in `packages/svelte/ds-global`, the anchor CI
 * installs from. On a machine where that build cannot start (NixOS), this
 * config's own variable, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, points at a system
 * Chromium; Playwright itself does not read it.
 *
 * There is no transform here and no build step: Vite resolves the `@import`
 * graph exactly as a consumer's bundler does, and the test reads what comes out.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  test: {
    name: "contract",
    include: ["tests/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: executablePath ? { executablePath } : undefined,
      }),
      instances: [{ browser: "chromium" }],
      // A failure is a list of layer or rule names; a screenshot of a page that
      // renders nothing would show nothing and would land in the tree.
      screenshotFailures: false,
    },
  },
});
