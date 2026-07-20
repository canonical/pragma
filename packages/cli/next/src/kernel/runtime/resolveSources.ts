/**
 * The store-boot decision table — storeless, and the single place the boot
 * strategy is decided.
 *
 * Boot never touches the network. From the lock and the resolved config:
 *
 * | lock present | pack cached | packages origin | → decision            |
 * |--------------|-------------|-----------------|-----------------------|
 * | yes          | yes         | —               | load the locked pack  |
 * | yes          | no          | —               | STORE_UNAVAILABLE     |
 * | no           | —           | default         | embedded fallback     |
 * | no           | —           | configured      | STORE_UNAVAILABLE     |
 *
 * A configured-but-unbuilt store (or a lock whose pack the cache lost)
 * surfaces STORE_UNAVAILABLE with a single recovery: `pragma sources update`.
 * "packages origin default" means the user has not pinned their own packages —
 * a fresh install — so the embedded fallback answers reads offline.
 */

import type { ConfigLayers } from "../config/types.js";
import { packIsComplete } from "./graphpack/manifest.js";
import { readLock } from "./lock.js";
import { packDir } from "./paths.js";

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
 * @param layers - The resolved config layers (for the `packages` origin).
 * @param cwd - The project directory (for the lock).
 * @returns The boot decision.
 * @note Impure — reads the lock and probes the pack cache.
 */
export function resolveSources(
  layers: ConfigLayers,
  cwd: string,
): SourcesDecision {
  const lock = readLock(cwd);
  if (lock) {
    const dir = packDir(lock.contentHash);
    if (packIsComplete(dir)) {
      return { kind: "pack", dir, contentHash: lock.contentHash };
    }
    return {
      kind: "unavailable",
      reason: "the locked pack is missing from the cache",
    };
  }

  if (layers.origins.packages === "default") {
    return { kind: "embedded" };
  }
  return {
    kind: "unavailable",
    reason: "packages are configured but the store has not been built",
  };
}
