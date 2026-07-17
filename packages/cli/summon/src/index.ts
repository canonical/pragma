/**
 * Public API surface for `@canonical/summon`.
 *
 * Re-exports the interactive Ink UI (`App`, `renderApp`) so other CLIs can
 * embed summon's prompt/preview/execute flow. The executable entry point
 * lives in `bin.tsx` and is intentionally not re-exported here — importing
 * it would run the CLI.
 *
 * @module
 */

export type { AppProps, AppState } from "./ui/index.js";
export { App, renderApp } from "./ui/index.js";
