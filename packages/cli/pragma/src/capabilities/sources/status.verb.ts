/**
 * The `sources status` verb — a storeless read.
 *
 * `needsStore: false` is load-bearing: status must report even a cold or
 * unbuilt store (`store: "unavailable"`), so it must NOT boot the store —
 * booting a cold store would throw STORE_UNAVAILABLE before status could say
 * so. Its `run` is a lazy thunk (the collector is dynamic-imported), keeping
 * the config reader off the fast path, exactly like `info`.
 */

import type { VerbSpec } from "../../kernel/spec/types.js";
import { statusFormatters } from "./status.render.js";
import type { SourcesStatusData } from "./types.js";

/** The `sources status` verb spec. */
export const statusVerb: VerbSpec<
  Record<string, unknown>,
  SourcesStatusData
> = {
  path: ["sources", "status"],
  summary: "Report which pack answers reads, and the packs it was built from.",
  doc: "Storeless — reads config and the pack cache without booting the store, so it works even when the store is cold. Reports whether reads are answered by a locally built pack, by the embedded snapshot, or not at all.",
  params: [],
  output: { formatters: statusFormatters },
  examples: [
    { cmd: "pragma sources status", note: "human-readable readiness summary" },
    { cmd: "pragma sources status --format json", note: "the full envelope" },
  ],
  capability: {
    needsStore: false,
    mutates: false,
    needsNetwork: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (_params, runtime) =>
    import("./collectStatus.js").then((module) =>
      module.collectStatus(runtime),
    ),
};
