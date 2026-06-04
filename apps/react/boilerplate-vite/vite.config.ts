import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Path aliases (#lib, #domains, #styles) are declared as Node subpath imports
// in package.json "imports" and resolved natively by Vite — no resolver plugin.
export default defineConfig({
  plugins: [react()],
  ssr: {
    // @canonical/* packages ship a "module" field (no "main"/"exports") that
    // Vite's SSR resolver — which does Node-style resolution — does not honour.
    // Bundling them for SSR uses the resolver that reads "module", so
    // ssrLoadModule resolves them instead of failing with
    // ERR_RESOLVE_PACKAGE_ENTRY_FAIL. Only relevant when deps are installed
    // from the registry (real directories); workspace symlinks resolve anyway.
    noExternal: [/^@canonical\//],
  },
});
