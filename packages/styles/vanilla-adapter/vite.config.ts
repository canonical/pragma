import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The fixtures run in a real browser: they build whole documents in iframes and
 * compare computed styles, which no DOM emulation can answer. Chromium is
 * Playwright's pinned build, the same one CI installs for every project tagged
 * `playwright`; on a machine where that build cannot start (NixOS), point
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH at a system Chromium.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  css: {
    preprocessorOptions: {
      // Vanilla is legacy Sass; its own deprecations are not this package's.
      scss: {
        silenceDeprecations: ["import", "global-builtin", "mixed-decls"],
      },
    },
  },
  test: {
    name: "fixtures",
    include: ["tests/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright({
        launchOptions: executablePath ? { executablePath } : undefined,
      }),
      instances: [{ browser: "chromium" }],
    },
  },
});
