/**
 * The `sources update` verb — resolve, build, and lock the store.
 *
 * A mutation (`mutates: true`) that needs the network (`needsNetwork: true`)
 * but NOT the pre-booted store (`needsStore: false`): update is what *creates*
 * the store, so the dispatcher must not try to boot it first (a cold boot would
 * throw STORE_UNAVAILABLE). `run` returns a `Promise<Task<R>>` — the union's
 * third arm — which the dispatcher awaits: for a real execution it resolves and
 * builds before handing back the lock-writing Task; for a preview
 * (`runtime.mutation.preview`) it stays network-free and hands back a
 * plan-only Task. `--frozen` re-resolves to the lock's pinned revisions.
 */

import type { Task } from "@canonical/task";
import type { VerbSpec } from "../../kernel/spec/types.js";
import type { SourcesUpdateData } from "./types.js";
import { updateFormatters } from "./update.render.js";

/** The `sources update` verb spec. */
export const updateVerb: VerbSpec<
  { frozen?: boolean; skipInvalid?: boolean },
  SourcesUpdateData
> = {
  path: ["sources", "update"],
  summary: "Resolve configured packages, build the local store, and lock it.",
  doc: "Resolves each configured package (git/file/npm), builds one content-addressed pack, and writes pragma.lock.json. Networkless boots then load from the lock.",
  params: [
    {
      kind: "boolean",
      name: "frozen",
      doc: "Re-resolve to the lock's pinned revisions exactly; never advance.",
    },
    {
      kind: "boolean",
      name: "skipInvalid",
      doc: "Skip sources that fail to parse (warning about each) and build from the rest, instead of failing the whole update.",
    },
  ],
  output: { formatters: updateFormatters },
  examples: [
    { cmd: "pragma sources update", note: "resolve, build, and lock" },
    {
      cmd: "pragma sources update --frozen",
      note: "reproduce the locked state",
    },
    {
      cmd: "pragma sources update --skip-invalid",
      note: "build from the parseable sources, warning about any dropped",
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
  // `run` really returns `Promise<Task<R>>`: `buildUpdateTask` awaits config
  // (and, on a real execution, resolves + builds) before handing back the
  // lock-writing Task — or, when `runtime.mutation.preview` is set, a
  // network-free plan Task. The dispatcher and MCP handler both `await` this
  // promise into a `Task`. The `VerbSpec.run` union is deliberately two-armed
  // (`Promise<R> | Task<R>`) — a third `Promise<Task<R>>` arm would poison async
  // read-verb inference — so the awaited-away Promise is presented through the
  // `Task<R>` arm by this single, honest cast.
  run: (params, runtime) =>
    import("./runUpdate.js").then((module) =>
      module.buildUpdateTask(
        runtime,
        params.frozen === true,
        params.skipInvalid === true,
      ),
    ) as unknown as Task<SourcesUpdateData>,
};
