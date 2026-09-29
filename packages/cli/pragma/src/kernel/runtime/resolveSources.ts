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
 * content hash `sources update` last built here), the pack's recorded builder
 * version, and the resolved config:
 *
 * | pointer | pack complete | built by       | packs origin | → decision          |
 * |---------|---------------|----------------|--------------|---------------------|
 * | yes     | yes           | this CLI/newer | —            | load the built pack |
 * | yes     | yes           | an older CLI   | configured   | load the built pack |
 * | yes     | yes           | an older CLI   | default      | embedded, pack named|
 * | yes     | no            | —              | —            | STORE_UNAVAILABLE   |
 * | no      | —             | —              | default      | embedded fallback   |
 * | no      | —             | —              | configured   | STORE_UNAVAILABLE   |
 *
 * A configured-but-unbuilt store (or a pointer whose pack the cache lost)
 * surfaces STORE_UNAVAILABLE with a single recovery: `pragma sources update`.
 * "packs origin default" means the user has not pinned their own packs —
 * a fresh install — so the embedded pack answers reads offline. A project that
 * DID configure its own packs is never quietly served the distribution's graph.
 *
 * The third row is the UPGRADE row, and it is why the pack's builder version is
 * part of the decision. A CLI upgrade ships a NEW embedded snapshot; a pack some
 * older CLI built in this directory weeks ago then answered every read from the
 * graph the upgrade replaced — silently, with `sources status` reporting a
 * healthy `built` store. So a pack built by an older CLI, in a project that
 * declares no packs of its own, YIELDS: the snapshot answers and the pack is
 * named as ignored ({@link IgnoredPack}) on every surface that reports on the
 * store, until `sources update` rebuilds it or `sources reset` removes it. The
 * second row is the other half of the same rule: a project with its own packs
 * has its own graph, and a snapshot of the distribution's is not a substitute
 * for it, stale or not — that project keeps today's behaviour exactly.
 */

import { existsSync } from "node:fs";
import { BIN_NAME, VERSION } from "../../constants.js";
import type { ConfigLayers } from "../config/types.js";
import { packArtifactsPresent, readManifest } from "./graphpack/manifest.js";
import { packIsOlderThanCli } from "./packVersion.js";
import { packDir, readActivePack } from "./paths.js";

/**
 * A built pack the boot decided to pass over: it was built by an older CLI, and
 * the project declares no packs of its own, so the CLI's own snapshot answers
 * instead. Carried on the decision (and onward on the booted session) so every
 * surface that reports on the store can name the pack it is NOT reading.
 */
export interface IgnoredPack {
  /** The passed-over pack's content hash (its cache directory name). */
  readonly contentHash: string;
  /** The CLI version that built it (its manifest `version`). */
  readonly builtBy: string;
  /** When it was built (its manifest `createdAt`). */
  readonly builtAt: string;
}

/** The resolved boot strategy. */
export type SourcesDecision =
  | {
      readonly kind: "pack";
      readonly dir: string;
      readonly contentHash: string;
    }
  | {
      readonly kind: "embedded";
      /**
       * Present only on the upgrade row: the built pack this project has, which
       * an older CLI built and which the snapshot is answering in place of.
       * Absent for an ordinary fresh install, which has no pack at all.
       */
      readonly ignoredPack?: IgnoredPack;
    }
  | { readonly kind: "unavailable"; readonly reason: string };

/**
 * The one sentence every surface uses for a passed-over pack.
 *
 * ONE wording, in one place, because the three surfaces that say it
 * (`sources status`, `doctor`'s pack refs row, and the recovery text a reader
 * lands on) must not each invent their own account of the same state. It names
 * the version and the day — the two facts that make the situation legible — and
 * both ways out, because they are genuinely different choices: rebuild if you
 * want your own packs back, reset if you want the shipped snapshot.
 *
 * @param ignored - The passed-over pack.
 * @returns The sentence, without a trailing full stop.
 */
export function describeIgnoredPack(ignored: IgnoredPack): string {
  return (
    `a pack built by ${BIN_NAME} ${ignored.builtBy} on ${ignored.builtAt.slice(0, 10)} is ignored — ` +
    `run \`${BIN_NAME} sources update\` to rebuild it or \`${BIN_NAME} sources reset\` to remove it`
  );
}

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
    // The manifest is read ONCE and used twice — for completeness (the half of
    // `packIsComplete` that is not the manifest itself) and for the builder
    // version. The boot decision is evaluated on the storeless fast path, so
    // asking the same ~1 KB file for the version separately would be a second
    // read for a field the first read already had in hand.
    const manifest = readManifest(dir);
    if (manifest !== undefined && packArtifactsPresent(dir)) {
      if (
        layers.origins.packs === "default" &&
        packIsOlderThanCli(manifest.version, VERSION)
      ) {
        return {
          kind: "embedded",
          ignoredPack: {
            contentHash,
            builtBy: manifest.version,
            builtAt: manifest.createdAt,
          },
        };
      }
      return { kind: "pack", dir, contentHash };
    }
    // Two different things, and the recovery text is the only thing a user has
    // to go on: the cache evicted the pack, or the directory is there but does
    // not hold a whole pack — the state EVERY install upgraded past the
    // four-file pack lands in, where "missing" is plainly contradicted by `ls`.
    return {
      kind: "unavailable",
      reason: existsSync(dir)
        ? "the built pack is incomplete — an older or torn build"
        : "the built pack is missing from the cache",
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
