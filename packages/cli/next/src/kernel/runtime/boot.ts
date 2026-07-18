/**
 * Build the per-invocation {@link PragmaRuntime}.
 *
 * The runtime stays cheap and storeless to construct: `store` is a lazy handle
 * (nothing boots until a `needsStore` verb calls `store.get()`), `query` is the
 * facade over it, and `loadConfig` memoizes the layered-config read behind a
 * dynamic import so the config reader (and its zod) never lands on the
 * `--help`/`__complete` fast path. No eager I/O happens here — a storeless verb
 * that only reads `globalFlags`/`cwd` touches neither the store nor config.
 */

import { VERSION } from "../../constants.js";
import type { ConfigLayers } from "../config/types.js";
import { createQueryFacade } from "./facade.js";
import { createLazyStore } from "./store.js";
import type { GlobalFlags, PragmaRuntime } from "./types.js";

/**
 * Assemble a runtime for one CLI or MCP invocation.
 *
 * @param globalFlags - The parsed global flags for this invocation.
 * @param cwd - The directory to resolve project state against (defaults to the
 *   process working directory).
 * @returns The runtime handed to every verb `run`.
 * @note Impure by default — reads `process.cwd()` unless `cwd` is provided; the
 *   store/config handles it exposes do their own I/O only when used.
 */
export function bootRuntime(
  globalFlags: GlobalFlags,
  cwd: string = process.cwd(),
): PragmaRuntime {
  let configPromise: Promise<ConfigLayers> | undefined;
  const loadConfig = (): Promise<ConfigLayers> => {
    configPromise ??= import("../config/readConfig.js").then((module) =>
      module.readConfig(cwd),
    );
    return configPromise;
  };

  const store = createLazyStore({ cwd, loadConfig });
  const query = createQueryFacade(store);

  return { cwd, version: VERSION, globalFlags, loadConfig, store, query };
}
