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

import { BIN_NAME } from "../../../constants.js";
import {
  entityTotal,
  readPackIndex,
} from "../../../kernel/completion/entitySource.js";
import { validateStories } from "../../../kernel/packs/index.js";
import {
  embeddedManifest,
  readManifest,
} from "../../../kernel/runtime/graphpack/index.js";
import { activeStories } from "../../../kernel/runtime/graphpack/stories.js";
import type { PragmaRuntime } from "../../../kernel/runtime/index.js";
import type { SourcesDecision } from "../../../kernel/runtime/resolveSources.js";
import { resolveSources } from "../../../kernel/runtime/resolveSources.js";
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
 * The answering pack's provenance, one item per pack it was built from.
 *
 * `sourceRef` is a single comma-joined string — `@canonical/design-system@git:
 * d6d8a6c8268cf2bd103e956a2540d6e36bd08d72, @canonical/anatomy-dsl@npm:0.2.2,
 * …` — and printing it whole put four packs and two forty-character SHAs on one
 * line, in a report whose every other multi-part check (`mcp`, `harnesses`)
 * uses the sub-item mechanism. Provenance is the thing a reader is here for
 * when they read this line at all: which revision of which pack answered.
 *
 * The scheme (`git`/`npm`/`self`/`file`) is kept because it says how to move
 * the pin, and a git hash is cut to the seven characters every other tool in
 * this workflow shows. A ref that does not parse is passed through whole rather
 * than dropped — an unreadable provenance is still provenance, and hiding it
 * would be the one failure this check exists to prevent.
 *
 * @param sourceRef - The manifest's comma-joined provenance string.
 * @returns One passing item per pack, in the order the pack records them.
 */
function packItems(sourceRef: string): CheckItem[] {
  return sourceRef
    .split(",")
    .map((ref) => ref.trim())
    .filter((ref) => ref !== "")
    .map((ref) => {
      const parsed = /^(.+)@(git|npm|self|file|link):(.+)$/.exec(ref);
      if (parsed === null) return { label: ref, status: "pass" as const };
      const [, pack, scheme, revision] = parsed as unknown as [
        string,
        string,
        string,
        string,
      ];
      const short =
        scheme === "git" && /^[0-9a-f]{40}$/.test(revision)
          ? revision.slice(0, 7)
          : revision;
      return {
        label: pack,
        detail: `${scheme} ${short}`,
        status: "pass" as const,
      };
    });
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
      remedy: `${BIN_NAME} sources update`,
    };
  }

  const index = readPackIndex(decision);
  const entities = (index ? entityTotal(index) : 0).toLocaleString();
  // The pack DOES answer reads, so the check itself passes; the ignored stories
  // are failing sub-items under it. (A `warn` status would ripple through the
  // renderer and the DoctorData counts to buy an icon.)
  const ignored = await ignoredStoryItems(decision);
  const suffix = ignoredSuffix(ignored);
  const sourceRef =
    decision.kind === "embedded"
      ? embeddedManifest().sourceRef
      : (readManifest(decision.dir)?.sourceRef ?? "");
  // Packs first, then anything wrong with them: the composition is the answer to
  // "which revision am I reading", and a failing story is a note about one of
  // the rows above it.
  const packs = packItems(sourceRef);
  const items = [...packs, ...ignored];
  const composition = `${packs.length} ${packs.length === 1 ? "pack" : "packs"}, ${entities} entities${suffix}`;

  if (decision.kind === "embedded") {
    return {
      name,
      status: "pass",
      // The update hint stays in the DETAIL rather than moving to `remedy`: the
      // renderer prints a remedy only under `fail` and `available`, and an
      // embedded snapshot answering reads correctly is neither.
      detail: `embedded snapshot — ${composition} · \`${BIN_NAME} sources update\` to build from the configured packs`,
      ...(items.length > 0 ? { items } : {}),
    };
  }
  const manifest = readManifest(decision.dir);
  return {
    name,
    status: "pass",
    detail:
      packs.length > 0
        ? `built ${manifest?.createdAt ?? "?"} — ${composition}`
        : `${decision.contentHash.slice(0, 12)} — ${composition}, built ${manifest?.createdAt ?? "?"}`,
    ...(items.length > 0 ? { items } : {}),
  };
}
