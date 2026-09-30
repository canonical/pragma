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
      // `storybook` is a peer dependency, so every subpath resolves from the
      // consumer. Matched by pattern rather than enumerated, so the next
      // `storybook/*` import does not get silently bundled: leaving
      // `storybook/theming` in was costing ~28KB of theming runtime in every
      // consumer's preview bundle once `THEME` became importable.
      external: [/^storybook(\/|$)/],
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.tests.ts"],
  },
});
