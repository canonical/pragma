/**
 * Public, types-only API surface for `@canonical/summon`.
 *
 * Per the tool-ts convention this barrel exports types only — no runtime
 * values cross the package boundary, so importing it can never start the CLI.
 * The runtime surface stays exactly where the `exports` map already puts it:
 * the `summon` binary and the `@canonical/summon/ui` subpath.
 *
 * `src/bin.tsx` is deliberately NOT re-exported: it parses `argv` and runs a
 * generator at module scope, so re-exporting it would turn an `import` into a
 * CLI invocation.
 *
 * @module
 */

export type { AppProps, AppState } from "./components/App.js";
