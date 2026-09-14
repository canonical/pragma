/**
 * The keyboard-only pass: Chromium alone, one worker, against the built
 * Storybook served by Vite's static preview on its own port — never 6012,
 * which a reviewer's static Storybook may already hold.
 *
 * `bun run build:storybook && bun run test:keyboard`. A Chromium other than
 * Playwright's own is used when `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` names
 * one; `DATAVIEWS_KEYBOARD_PORT` moves the port.
 */

import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env["DATAVIEWS_KEYBOARD_PORT"] ?? 6013);
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"];

export default defineConfig({
  testDir: resolve(import.meta.dirname, "keyboard"),
  testMatch: "**/*.keyboard.ts",
  outputDir: join(tmpdir(), "dataviews-react-keyboard"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: executablePath === undefined ? {} : { executablePath },
  },
  webServer: {
    command: `vite preview --outDir storybook-static --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: resolve(import.meta.dirname, ".."),
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: false,
  },
});
