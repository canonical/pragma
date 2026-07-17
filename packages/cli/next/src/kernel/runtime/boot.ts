/**
 * Build the per-invocation {@link PragmaRuntime}.
 *
 * PR1 is storeless: the runtime carries only what every verb needs regardless
 * of the store — the working directory, the CLI version, and the parsed global
 * flags. The store handle (and resolved config/packages) join this shape when
 * the first store-backed capability lands, so a verb only ever sees fields that
 * are actually populated by the time it runs.
 */

import { VERSION } from "../../constants.js";
import type { GlobalFlags, PragmaRuntime } from "./types.js";

/**
 * Assemble a runtime for one CLI or MCP invocation.
 *
 * @param globalFlags - The parsed global flags for this invocation.
 * @param cwd - The directory to resolve project state against (defaults to the
 *   process working directory).
 * @returns The storeless runtime handed to every verb `run`.
 * @note Impure by default — reads `process.cwd()` unless `cwd` is provided.
 */
export function bootRuntime(
  globalFlags: GlobalFlags,
  cwd: string = process.cwd(),
): PragmaRuntime {
  return { cwd, version: VERSION, globalFlags };
}
