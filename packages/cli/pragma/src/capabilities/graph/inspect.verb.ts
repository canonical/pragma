/**
 * `graph inspect <uri>` — every triple where the URI is the subject, grouped by
 * predicate. The CLI twin of the MCP resource read (both share {@link readEntity}
 * in PR3's resources browser); `graph query` (arbitrary SPARQL) lands in PR6.
 *
 * Store-backed: the URI is resolved through the store's merged prefix map and
 * validated to the embeddable shape before it is interpolated, so a prefixed
 * name or absolute IRI addresses the subject exactly.
 */

import {
  BIN_NAME,
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
} from "../../constants.js";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import { readEntity } from "../../kernel/runtime/readEntity.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/index.js";
import { inspectFormatters } from "./inspect.render.js";

const inspectVerb: VerbSpec<Record<string, unknown>, InspectResult> = {
  path: ["graph", "inspect"],
  summary:
    "Show every triple where a URI is the subject, grouped by predicate.",
  doc: "Inspect one entity: all predicate/object pairs asserted on the subject. Address it by prefixed name (ds:global.component.button) or absolute IRI.",
  params: [
    {
      kind: "string",
      name: "uri",
      doc: "The subject URI — a prefixed name or absolute IRI.",
      positional: true,
      required: true,
      complete: { kind: "names", source: { from: "index", type: "" } },
    },
  ],
  output: { formatters: inspectFormatters },
  // The read is BOUNDED by disclosure — inbound exemplars and literal previews
  // both widen with the level — so the verb must declare the ladder it honours.
  // Without this the CLI `--detail` flag has nothing to validate against and the
  // MCP projector injects no `detail` argument at all, so the documented knob
  // was one an agent could not actually reach.
  disclosure: { levels: [...DETAIL_LEVELS], default: DEFAULT_DETAIL_LEVEL },
  examples: [
    { cmd: `${BIN_NAME} graph inspect ds:global.component.button` },
    {
      cmd: `${BIN_NAME} graph inspect https://ds.canonical.com/global.component.button`,
    },
  ],
  capability: {
    needsStore: true,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
    readEntity(rt, String(params.uri)),
};

/** The `graph inspect` verb. */
export const graphInspectVerb = asVerb(inspectVerb);
