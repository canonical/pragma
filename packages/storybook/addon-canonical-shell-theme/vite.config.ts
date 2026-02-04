import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        preview: resolve(__dirname, "src/preview.ts"),
        manager: resolve(__dirname, "src/manager.ts"),
      },
      formats: ["es"],
    },
    outDir: "dist/esm",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
      external: ["storybook/manager-api", "storybook/internal/types"],
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.tests.ts"],
  },
});
