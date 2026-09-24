import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const TIME_ZONE = "America/Los_Angeles";

export default defineConfig({
  plugins: [svelte({})],
  test: {
    environment: "node",
    env: {
      TZ: TIME_ZONE,
    },
    include: ["src/**/*.tests.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "client",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              contextOptions: {
                timezoneId: TIME_ZONE,
              },
            }),
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
          include: ["src/**/*.svelte.test.{js,ts}"],
          exclude: ["src/lib/server/**"],
          // All files share one iframe, run sequentially (isolate:false): the
          // browser process is per-engine either way; this removes the
          // per-file iframe spawn and module re-import. vitest-browser-svelte
          // unmounts components between tests, so the DOM does not accumulate.
          isolate: false,
          setupFiles: ["./vitest-setup-client.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ssr",
          environment: "node",
          // Worker reuse across files; the per-file fork respawn is pure
          // overhead. Browser projects stay isolated (see the client project).
          isolate: false,
          include: ["src/**/*.ssr.test.{js,ts}"],
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          // Worker reuse across files; the per-file fork respawn is pure
          // overhead. Browser projects stay isolated (see the client project).
          isolate: false,
          include: ["src/**/*.test.{js,ts}"],
          exclude: [
            "src/**/*.svelte.test.{js,ts}",
            "src/**/*.ssr.test.{js,ts}",
          ],
        },
      },
    ],
  },
});
