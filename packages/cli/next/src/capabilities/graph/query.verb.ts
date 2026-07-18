/**
 * `graph query <sparql>` — the raw SPARQL escape hatch (the twin of `graph
 * inspect`'s single-entity read). Store-backed and read-only: the dispatcher
 * boots the store before `run`, and `rt.query.sparql` auto-prefixes the query
 * from the pack's prefix map, so `ds:Component` resolves without a PREFIX line.
 *
 * Injection-safe by construction: the whole query IS the user's text — there is
 * no interpolation into a template — so there is nothing to escape. A malformed
 * query surfaces as INVALID_INPUT with a recovery pointer to `ontology list`.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { queryFormatters } from "./query.render.js";

// Inline `import("…")` type (no `from`) so the ke types stay OFF the static
// graph — the lazy-dispatch probe forbids a static ke import on any file
// reachable from capabilities/index, keeping the WASM runtime off the fast path.
type QueryResult = import("@canonical/ke").QueryResult;

const queryVerb: VerbSpec<Record<string, unknown>, QueryResult> = {
  path: ["graph", "query"],
  summary: "Run a raw SPARQL query against the loaded graph.",
  doc: "Executes an arbitrary SELECT / ASK / CONSTRUCT query against the store. Prefixes are applied automatically from the pack's namespace map — see `pragma ontology list`.",
  params: [
    {
      kind: "string",
      name: "sparql",
      doc: "The SPARQL query text (SELECT, ASK, or CONSTRUCT).",
      positional: true,
      required: true,
    },
  ],
  output: { formatters: queryFormatters },
  examples: [
    {
      cmd: 'pragma graph query "SELECT ?s WHERE { ?s a ds:Component }"',
      note: "list every component subject",
    },
    {
      cmd: 'pragma graph query "ASK { ds:button a ds:Component }" --format json',
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
    import("./runQuery.js").then((m) => m.runQuery(rt, String(params.sparql))),
};

/** The `graph query` verb. */
export const graphQueryVerb = asVerb(queryVerb);
