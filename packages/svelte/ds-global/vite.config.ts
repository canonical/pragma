import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "client",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
          include: ["src/**/*.svelte.test.{js,ts}"],
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
