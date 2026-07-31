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
 *
 * It also names every read story that pack carries but cannot use. Those are
 * DROPPED at dispatch rather than thrown (a third-party story must never break
 * a command), so doctor is where the user finds out — and it goes through the
 * same `validateStories` the dispatch path uses, so the two can never disagree.
 */

import {
  entityTotal,
  readPackIndex,
} from "../../../kernel/completion/entitySource.js";
import { validateStories } from "../../../kernel/packs/collect.js";
import { embeddedManifest } from "../../../kernel/runtime/graphpack/embedded.js";
import { readManifest } from "../../../kernel/runtime/graphpack/manifest.js";
import { activeStories } from "../../../kernel/runtime/graphpack/stories.js";
import type { SourcesDecision } from "../../../kernel/runtime/resolveSources.js";
import { resolveSources } from "../../../kernel/runtime/resolveSources.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { CheckItem, CheckResult } from "../types.js";

/**
 * The stories the answering pack carries but cannot use, as check items.
 *
 * The registry is reached through a RUNTIME dynamic import (as
 * `collectColophon` does) so the static `capabilities/index → doctorModule →
 * checkPackageRefs → capabilities/index` cycle can never form.
 *
 * @param decision - The boot decision the check already resolved.
 * @returns One failing item per ignored story, in declaration order.
 * @note Impure — reads the answering pack's `stories.json`.
 */
async function ignoredStoryItems(
  decision: SourcesDecision,
): Promise<CheckItem[]> {
  const { capabilities } = await import("../../index.js");
  const { problems } = validateStories(activeStories(decision), capabilities);
  return problems.map((problem) => ({
    label: problem.source,
    detail: problem.message,
    status: "fail" as const,
  }));
}

/** ` · N story/ies ignored` for a headline, or nothing when all are usable. */
function ignoredSuffix(items: readonly CheckItem[]): string {
  if (items.length === 0) return "";
  return ` · ${items.length} ${items.length === 1 ? "story" : "stories"} ignored`;
}

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
  // The pack DOES answer reads, so the check itself passes; the ignored stories
  // are failing sub-items under it. (A `warn` status would ripple through the
  // renderer and the DoctorData counts to buy an icon.)
  const items = await ignoredStoryItems(decision);
  const suffix = ignoredSuffix(items);
  if (decision.kind === "embedded") {
    return {
      name,
      status: "pass",
      detail: `embedded snapshot @ ${embeddedManifest().sourceRef} — ${entities} entities${suffix} · \`pragma sources update\` to build from the configured packs`,
      ...(items.length > 0 ? { items } : {}),
    };
  }
  const manifest = readManifest(decision.dir);
  return {
    name,
    status: "pass",
    detail: `${manifest?.sourceRef ?? decision.contentHash.slice(0, 12)} — ${entities} entities, built ${manifest?.createdAt ?? "?"}${suffix}`,
    ...(items.length > 0 ? { items } : {}),
  };
}
