/**
 * The STORELESS store-readiness check — the ONE source of the cold-store
 * `STORE_UNAVAILABLE` error (its message AND its `pragma sources update` /
 * `sources_update` recovery), shared by the lazy store boot ({@link
 * loadStoreSession}) and the native MCP discovery surfaces (the `prompts/*`
 * provider, the `pragma:{+uri}` resource browser).
 *
 * A cold store must present the SAME diagnostic on every surface: an agent that
 * lists prompts over the `prompt_list` tool (store-backed, so its `needsStore`
 * pre-check throws) and one that lists them over native `prompts/list` must see
 * the identical `STORE_UNAVAILABLE` + `sources_update` recovery, not one error
 * and one silently-empty list. Centralizing the construction here is what keeps
 * those surfaces from drifting apart.
 *
 * It reaches only {@link resolveSources} (a lock + config probe — no store, no
 * ke), so a caller on the storeless fast path can pre-check availability without
 * ever booting the store.
 */

import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import type { ConfigLayers } from "../config/types.js";
import { PragmaError } from "../error/PragmaError.js";
import { cliRecovery } from "../error/recovery.js";
import { resolveSources } from "./resolveSources.js";

/**
 * Build the canonical cold-store `STORE_UNAVAILABLE` error: the reason plus the
 * single `pragma sources update` recovery that also names the `sources_update`
 * tool an agent calls (then retries — PR9's C1 cold-store retry succeeds).
 *
 * @param reason - The boot decision's reason (e.g. "the locked pack is missing").
 * @returns The structured STORE_UNAVAILABLE error.
 */
export function storeUnavailable(reason: string): PragmaError {
  return PragmaError.storeUnavailable(`${reason}.`, {
    recovery: cliRecovery(
      `${RECOVERY_CLI_PREFIX}sources update`,
      "Build the local store from the configured packages.",
      { tool: "sources_update" },
    ),
  });
}

/**
 * The STORE_UNAVAILABLE error to surface when the store cannot boot from the
 * current config/lock, or `undefined` when a store read may proceed. STORELESS —
 * probes the decision table only, never constructs the store.
 *
 * @param layers - The resolved config layers.
 * @param cwd - The project directory the boot resolves against.
 * @returns The error to surface cold, or `undefined` when the store is available.
 */
export function checkStoreAvailable(
  layers: ConfigLayers,
  cwd: string,
): PragmaError | undefined {
  const decision = resolveSources(layers, cwd);
  return decision.kind === "unavailable"
    ? storeUnavailable(decision.reason)
    : undefined;
}
