/**
 * Resolve the boot decision into a live {@link StoreSession} — the heavy,
 * dynamic-import-only module that pulls ke/ke-graphql/oxigraph.
 *
 * The lazy store reaches this behind `await import(...)`, so nothing on the
 * storeless fast path (or in the `capabilities/index` static graph) loads the
 * runtime. Boot is cache-only and networkless: a cold store surfaces
 * STORE_UNAVAILABLE with the single `pragma sources update` recovery, rather
 * than silently reaching out.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import type { ConfigLayers } from "../config/types.js";
import { PragmaError } from "../error/PragmaError.js";
import { cliRecovery } from "../error/recovery.js";
import { materializeEmbeddedPack } from "./graphpack/embedded.js";
import { readPack } from "./graphpack/read.js";
import { resolveSources } from "./resolveSources.js";
import type { StoreSession } from "./types.js";

/** What {@link loadStoreSession} needs from the runtime. */
export interface LoadSessionContext {
  readonly cwd: string;
  readonly loadConfig: () => Promise<ConfigLayers>;
}

/**
 * Boot the store session per the decision table.
 *
 * @param ctx - The working directory and memoized config loader.
 * @returns The booted store session.
 * @throws PragmaError STORE_UNAVAILABLE when the store is cold.
 * @note Impure — reads config, materializes/loads a pack, boots oxigraph.
 */
export async function loadStoreSession(
  ctx: LoadSessionContext,
): Promise<StoreSession> {
  const layers = await ctx.loadConfig();
  const decision = resolveSources(layers, ctx.cwd);

  if (decision.kind === "unavailable") {
    throw PragmaError.storeUnavailable(`${decision.reason}.`, {
      recovery: cliRecovery(
        `${RECOVERY_CLI_PREFIX}sources update`,
        "Build the local store from the configured packages.",
        // An agent recovers by calling the tool (then retrying — PR9's C1 cold-
        // store retry makes a post-update retry succeed).
        { tool: "sources_update" },
      ),
    });
  }

  const dir =
    decision.kind === "embedded" ? materializeEmbeddedPack() : decision.dir;
  return readPack(dir);
}
