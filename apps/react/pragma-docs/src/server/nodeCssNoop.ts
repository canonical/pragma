/**
 * Node module hook that resolves `.css` imports to an empty module.
 *
 * The Express dev server imports the app's route modules NATIVELY (see
 * `prepareRelayData.ts` — the route→query map must live in the same registry
 * as the backend), and that import chain carries client CSS side-effect
 * imports (e.g. `src/lib/Chip/styles.css`), which Node cannot load
 * (ERR_UNKNOWN_FILE_EXTENSION — tsx transforms TS/TSX only). Vite is not in
 * that chain, so the styles are dropped harmlessly: the render world still
 * loads through Vite, which processes the same CSS for the page.
 *
 * MUST be preloaded via a `--import` flag AFTER `--import tsx` (see the
 * `dev:express` script): ESM loads a static import graph in full before any
 * module body evaluates, so an in-file side-effect import registers the hook
 * too late for its own graph. A `--import` module evaluates before the entry
 * module's graph loads. The Bun brick needs none of this — Bun's runtime
 * accepts CSS imports.
 */

import * as nodeModule from "node:module";

// Namespace import + guard rather than a named import: Bun implements no
// `registerHooks` (and needs none — its runtime accepts CSS imports), and a
// named import of a missing export is a link-time error there.
if (typeof nodeModule.registerHooks === "function") {
  nodeModule.registerHooks({
    load(url, context, nextLoad) {
      if (url.endsWith(".css")) {
        return {
          format: "module",
          shortCircuit: true,
          source: "// .css import stubbed for the native server registry\n",
        };
      }
      return nextLoad(url, context);
    },
  });
}
