import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// biome-ignore lint/suspicious/noExplicitAny: Vite 8 plugin types are incompatible with vitest's Vite 7 re-exports
const plugins: any[] = [react()];

export default defineConfig({
  plugins,
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.ssr.test.tsx",
        "**/*.d.ts",
        "**/types.ts",
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    projects: [
      {
        plugins,
        test: {
          name: "client",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: ["src/**/*.ssr.test.tsx"],
        },
      },
      {
        plugins,
        test: {
          name: "ssr",
          environment: "node",
          include: ["src/**/*.ssr.test.tsx"],
        },
      },
    ],
  },
});
