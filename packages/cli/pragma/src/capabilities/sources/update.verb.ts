/**
 * The `sources update` verb — resolve the configured packs, build the store,
 * and point the project at it.
 *
 * A mutation (`mutates: true`) that reaches the network but NOT the pre-booted
 * store (`needsStore: false`). The network need is a property of the run body,
 * not of the grammar: `needsNetwork` was a declared field that no dispatcher,
 * projector or renderer ever read, and it is gone. `needsStore` is real — update
 * is what *creates* the store, so the dispatcher must not try to boot it first
 * (a cold boot would throw STORE_UNAVAILABLE). `run` returns a `Promise<Task<R>>` — the union's
 * third arm — which the dispatcher awaits: for a real execution it resolves and
 * builds before handing back the pointer-writing Task; for a preview
 * (`runtime.mutation.preview`) it stays network-free and hands back a
 * plan-only Task.
 */

import type { Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import type { SourcesUpdateData } from "./types.js";
import { updateFormatters } from "./update.render.js";

/** The `sources update` verb spec. */
export const updateVerb: VerbSpec<
  { skipInvalid?: boolean },
  SourcesUpdateData
> = {
  path: ["sources", "update"],
  summary: "Resolve configured packs and build the local store from them.",
  doc: "Resolves each configured pack (git/file/npm) and builds one content-addressed pack, which every later boot reads with no network access. Pin a revision by putting a commit SHA in the pack's source ref.",
  params: [
    {
      kind: "boolean",
      name: "skipInvalid",
      doc: "Skip sources that fail to parse (warning about each) and build from the rest, instead of failing the whole update.",
    },
  ],
  output: { formatters: updateFormatters },
  examples: [
    { cmd: `${BIN_NAME} sources update`, note: "resolve and build" },
    {
      cmd: `${BIN_NAME} sources update --skip-invalid`,
      note: "build from the parseable sources, warning about any dropped",
    },
  ],
  capability: {
    needsStore: false,
    mutates: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
  },
  // `run` really returns `Promise<Task<R>>`: `buildUpdateTask` awaits config
  // (and, on a real execution, resolves + builds) before handing back the
  // pointer-writing Task — or, when `runtime.mutation.preview` is set, a
  // network-free plan Task. The dispatcher and MCP handler both `await` this
  // promise into a `Task`. The `VerbSpec.run` union is deliberately two-armed
  // (`Promise<R> | Task<R>`) — a third `Promise<Task<R>>` arm would poison async
  // read-verb inference — so the awaited-away Promise is presented through the
  // `Task<R>` arm by this single, honest cast.
  run: (params, runtime) =>
    import("./runUpdate.js").then((module) =>
      module.buildUpdateTask(runtime, params.skipInvalid === true),
    ) as unknown as Task<SourcesUpdateData>,
};
