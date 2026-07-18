/**
 * The `sources update` verb — resolve, build, and lock the store.
 *
 * A mutation (`mutates: true`) that needs the network (`needsNetwork: true`)
 * but NOT the pre-booted store (`needsStore: false`): update is what *creates*
 * the store, so the dispatcher must not try to boot it first (a cold boot would
 * throw STORE_UNAVAILABLE). `run` is async — it resolves and builds eagerly,
 * then returns the lock-writing Task — so the dispatcher awaits it. `--frozen`
 * re-resolves to the lock's pinned revisions and never advances.
 */

import type { Task } from "@canonical/task";
import type { VerbSpec } from "../../kernel/spec/types.js";
import type { SourcesUpdateData } from "./types.js";
import { updateFormatters } from "./update.render.js";

/** The `sources update` verb spec. */
export const updateVerb: VerbSpec<{ frozen?: boolean }, SourcesUpdateData> = {
  path: ["sources", "update"],
  summary: "Resolve configured packages, build the local store, and lock it.",
  doc: "Resolves each configured package (git/file/npm), builds one content-addressed pack, and writes pragma.lock.json. Networkless boots then load from the lock.",
  params: [
    {
      kind: "boolean",
      name: "frozen",
      doc: "Re-resolve to the lock's pinned revisions exactly; never advance.",
    },
  ],
  output: { formatters: updateFormatters },
  examples: [
    { cmd: "pragma sources update", note: "resolve, build, and lock" },
    {
      cmd: "pragma sources update --frozen",
      note: "reproduce the locked state",
    },
  ],
  capability: {
    needsStore: false,
    mutates: true,
    needsNetwork: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
  },
  // Async setup: resolve + build eagerly, then hand back the lock-writing Task.
  // The dispatcher awaits the promise; the cast presents it through the union's
  // `Task` arm (kept narrow so read verbs' inference is unaffected).
  run: (params, runtime) =>
    import("./runUpdate.js").then((module) =>
      module.buildUpdateTask(runtime, params.frozen === true),
    ) as unknown as Task<SourcesUpdateData>,
};
