import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    projects: [
      {
        plugins: [react(), tsconfigPaths()],
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
        plugins: [react(), tsconfigPaths()],
        test: {
          name: "ssr",
          environment: "node",
          include: ["src/**/*.ssr.test.tsx"],
        },
      },
    ],
  },
});
