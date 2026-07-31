/**
 * The store-boot decision table — storeless, and the single place the boot
 * strategy is decided. No other module re-derives it: `sources status`, `info`,
 * `doctor`, and the native MCP prompt/resource surfaces all switch on what this
 * returns (`readPackIndex` takes the decision rather than resolving a pack of
 * its own). The one module that cannot is the shell-completion fast path, which
 * is denied the config evaluator and so implements the pointer half only — it
 * says so, and it answers with completion candidates, never content.
 *
 * Boot never touches the network. From the project's active-pack pointer (the
 * content hash `sources update` last built here) and the resolved config:
 *
 * | pointer | pack complete | packs origin | → decision            |
 * |---------|---------------|--------------|-----------------------|
 * | yes     | yes           | —            | load the built pack   |
 * | yes     | no            | —            | STORE_UNAVAILABLE     |
 * | no      | —             | default      | embedded fallback     |
 * | no      | —             | configured   | STORE_UNAVAILABLE     |
 *
 * A configured-but-unbuilt store (or a pointer whose pack the cache lost)
 * surfaces STORE_UNAVAILABLE with a single recovery: `pragma sources update`.
 * "packs origin default" means the user has not pinned their own packs —
 * a fresh install — so the embedded pack answers reads offline. A project that
 * DID configure its own packs is never quietly served the distribution's graph.
 */

import type { ConfigLayers } from "../config/types.js";
import { packIsComplete } from "./graphpack/manifest.js";
import { packDir, readActivePack } from "./paths.js";

/** The resolved boot strategy. */
export type SourcesDecision =
  | {
      readonly kind: "pack";
      readonly dir: string;
      readonly contentHash: string;
    }
  | { readonly kind: "embedded" }
  | { readonly kind: "unavailable"; readonly reason: string };

/**
 * Decide how (or whether) to boot the store — without any network or store I/O.
 *
 * @param layers - The resolved config layers (for the `packs` origin).
 * @param cwd - The project directory (for the active-pack pointer).
 * @returns The boot decision.
 * @note Impure — reads the pointer and probes the pack cache.
 */
export function resolveSources(
  layers: ConfigLayers,
  cwd: string,
): SourcesDecision {
  const contentHash = readActivePack(cwd);
  if (contentHash !== undefined) {
    const dir = packDir(contentHash);
    if (packIsComplete(dir)) return { kind: "pack", dir, contentHash };
    return {
      kind: "unavailable",
      reason: "the built pack is missing from the cache",
    };
  }

  if (layers.origins.packs === "default") {
    return { kind: "embedded" };
  }
  return {
    kind: "unavailable",
    reason: "packs are configured but the store has not been built",
  };
}
