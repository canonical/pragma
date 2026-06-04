import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Path aliases (#lib, #domains, #styles) are declared as Node subpath imports
// in package.json "imports" and resolved natively by Vite — no resolver plugin.
export default defineConfig({
  plugins: [react()],
  ssr: {
    // Bundle @canonical/* for SSR rather than externalising them, for two
    // reasons: (1) some packages declare only a "module" entry (no
    // "main"/"exports"), which Vite's SSR (Node-style) resolver ignores —
    // externalising them fails with ERR_RESOLVE_PACKAGE_ENTRY_FAIL; (2) their
    // built output imports CSS as a side effect (e.g. `import "./x.css"`),
    // which Node cannot load (ERR_UNKNOWN_FILE_EXTENSION) but Vite's SSR
    // transform no-ops. The regex covers the whole scope so any current or
    // future @canonical dependency is handled.
    noExternal: [/^@canonical\//],
  },
});
