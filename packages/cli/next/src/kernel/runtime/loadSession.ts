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

import type { ConfigLayers } from "../config/types.js";
import { materializeEmbeddedPack } from "./graphpack/embedded.js";
import { readPack } from "./graphpack/read.js";
import { resolveSources } from "./resolveSources.js";
import { storeUnavailable } from "./storeReadiness.js";
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
    // The SAME cold-store diagnostic the native MCP surfaces raise (shared via
    // storeReadiness), so a cold store reads identically on every surface.
    throw storeUnavailable(decision.reason);
  }

  const dir =
    decision.kind === "embedded" ? materializeEmbeddedPack() : decision.dir;
  return readPack(dir);
}
