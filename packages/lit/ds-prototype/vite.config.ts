import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { litCss } from "./vite-plugin-lit-css.js";

const packageDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    litCss({
      verbose: false,
      // Only transform CSS files within this package's own src/ directory
      include: new RegExp(`^${resolve(packageDir, "src")}`),
    }),
  ],
  publicDir: "public",
  server: {
    open: "/public/example.html",
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "esm/index.js",
    },
    rollupOptions: {
      external: [/^lit($|\/)/],
    },
  },
});
