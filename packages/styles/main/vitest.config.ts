// Testing posture: Measured — coverage tracked, no enforced threshold yet
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The package ships CSS, and its two suites ask two different kinds of question,
 * so they run in two different places.
 *
 * `entries` asks how the four entry points relate to one another: which files
 * each pulls in, how often, and what the resolved text of each contains. That is
 * answered by reading the files, and it runs in Node.
 *
 * `contract` asks what a browser makes of the resolved stylesheet: which layers
 * exist and in what order, what is nested inside what, which declarations are
 * important. A cascade layer is not text, and the CSSOM of an engine that
 * implements the cascade is the only parser that reports what a browser will
 * actually do with one, so that suite runs in Chromium — Playwright's pinned
 * build, the same one CI installs for every project tagged `playwright`. This
 * package's `playwright` range must stay equal to the one in
 * `packages/svelte/ds-global`, the anchor CI installs from. On a machine where
 * that build cannot start (NixOS), PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH points at
 * a system Chromium; Playwright itself does not read that variable.
 *
 * Neither suite builds anything. The tests read what a consumer's bundler would
 * resolve, and nothing is transformed on the way.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "entries",
          include: ["tests/entries.test.ts"],
        },
      },
      {
        test: {
          name: "contract",
          include: ["tests/layer-set.test.js"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: executablePath ? { executablePath } : undefined,
            }),
            instances: [{ browser: "chromium" }],
            // A failure is a list of layer or rule names; a screenshot of a page
            // that renders nothing would show nothing and would land in the tree.
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});
