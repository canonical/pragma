import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

/**
 * The fixtures run in a real browser: they build whole documents in iframes and
 * compare computed styles, which no DOM emulation can answer. Chromium is
 * Playwright's pinned build, the same one CI installs for every project tagged
 * `playwright`; this package's `playwright` range must stay equal to the one in
 * `packages/svelte/ds-global`, the anchor CI installs from. On a machine where
 * that build cannot start (NixOS), this config's own variable,
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, points at a system Chromium; Playwright
 * itself does not read it.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

/** Operating-system preferences a test can set through the `emulateMedia` command. */
export interface MediaEmulation {
  colorScheme?: "light" | "dark" | null;
  reducedMotion?: "reduce" | "no-preference" | null;
}

export default defineConfig({
  resolve: {
    // Vanilla exposes its Sass only under the `sass` export condition.
    conditions: ["sass", ...defaultClientConditions],
  },
  css: {
    preprocessorOptions: {
      // Vanilla is legacy Sass; its own deprecations are not this package's.
      scss: {
        silenceDeprecations: ["import", "global-builtin", "if-function"],
      },
    },
  },
  test: {
    name: "fixtures",
    include: ["tests/**/*.test.ts"],
    // The verbose reporter is the one that prints skip reasons.
    reporters: ["verbose"],
    // Media emulation is page-wide and files share the page, so they run one
    // at a time: an emulation set by one file cannot reach another's tests.
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: executablePath ? { executablePath } : undefined,
      }),
      instances: [{ browser: "chromium" }],
      // A failure is a list of computed-style differences; a screenshot of the
      // test page shows nothing and would land in the tree.
      screenshotFailures: false,
      commands: {
        // Operating-system preferences the page under test cannot set itself.
        emulateMedia: async ({ page }, media: MediaEmulation) => {
          await page.emulateMedia(media);
        },
      },
    },
  },
});
