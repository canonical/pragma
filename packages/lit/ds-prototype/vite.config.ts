import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { litCss } from "./vite-plugin-lit-css.js";

const packageDir = dirname(fileURLToPath(import.meta.url));

// Build a list of library entry points: the root barrel plus every component's
// own barrel (src/lib/<Component>/index.ts). Treating each component index as
// an entry point means rollup preserves its public export interface instead of
// hoisting the re-exports up to the root bundle, so the per-component subpaths
// in package.json "exports" resolve to files that actually re-export the
// component. Combined with output.preserveModules below, each component
// compiles to its own JS file for better tree-shaking. See issue #480.
const libDir = resolve(packageDir, "src/lib");
const componentEntries = readdirSync(libDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(libDir, entry.name, "index.ts"));
const entry = [resolve(packageDir, "src/index.ts"), ...componentEntries];

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
      entry,
      formats: ["es"],
    },
    rollupOptions: {
      external: [/^lit($|\/)/],
      output: {
        // Emit one JS file per source module (mirroring src/) instead of a
        // single bundle, so consumers can import individual components via the
        // per-component subpaths in package.json "exports" for better
        // tree-shaking and smaller bundles. See issue #480.
        preserveModules: true,
        preserveModulesRoot: "src",
        dir: "dist/esm",
        entryFileNames: "[name].js",
      },
    },
  },
});
