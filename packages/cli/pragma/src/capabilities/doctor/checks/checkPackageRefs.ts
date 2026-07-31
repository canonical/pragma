/**
 * Doctor check: report which pack answers this project's reads.
 *
 * It switches on the ONE boot decision ({@link resolveSources}) rather than
 * re-deriving it from config, so doctor can never call an install healthy that
 * every read would fail. That is the whole point of the check: a project that
 * configured its own packs and never built them reports `fail` with the update
 * remedy — not a pass listing the distribution's packs it is not reading.
 * Storeless throughout: the pointer, the manifest, and the entity index are
 * read off disk, never through a store session.
 */

import {
  entityTotal,
  readPackIndex,
} from "../../../kernel/completion/entitySource.js";
import { embeddedManifest } from "../../../kernel/runtime/graphpack/embedded.js";
import { readManifest } from "../../../kernel/runtime/graphpack/manifest.js";
import { resolveSources } from "../../../kernel/runtime/resolveSources.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { CheckResult } from "../types.js";

/**
 * Report which pack answers reads, its provenance, and its entity total.
 *
 * @param rt - The per-invocation runtime.
 * @returns A CheckResult naming the answering pack, or the failure to build one.
 * @note Impure — reads config, the active-pack pointer, and the pack index.
 */
export async function checkPackageRefs(
  rt: PragmaRuntime,
): Promise<CheckResult> {
  const decision = resolveSources(await rt.loadConfig(), rt.cwd);
  // The display says "packs" (config declarations); the file/function keep
  // "Package" (npm/git resolution vocabulary).
  const name = "pack refs";

  if (decision.kind === "unavailable") {
    return {
      name,
      status: "fail",
      detail: decision.reason,
      remedy: "pragma sources update",
    };
  }

  const index = readPackIndex(decision);
  const entities = (index ? entityTotal(index) : 0).toLocaleString();
  if (decision.kind === "embedded") {
    return {
      name,
      status: "pass",
      detail: `embedded snapshot @ ${embeddedManifest().sourceRef} — ${entities} entities · \`pragma sources update\` to build from the configured packs`,
    };
  }
  const manifest = readManifest(decision.dir);
  return {
    name,
    status: "pass",
    detail: `${manifest?.sourceRef ?? decision.contentHash.slice(0, 12)} — ${entities} entities, built ${manifest?.createdAt ?? "?"}`,
  };
}
