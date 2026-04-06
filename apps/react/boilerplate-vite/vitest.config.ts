import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    coverage: {
      exclude: [],
      include: [
        "src/Navigation.tsx",
        "src/domains/**/*.tsx",
        "src/routes.tsx",
        "src/ssr/Shell.tsx",
        "src/ssr/entry-server.tsx",
      ],
      provider: "v8",
      reporter: ["text"],
    },
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.tests.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
