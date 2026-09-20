/**
 * Formatters for `pragma graph query` — plain, llm, json (no ink).
 *
 * Ported verbatim from the old shell's `graph/formatters/query.ts`:
 * - plain: a tab-separated table for SELECT, `ASK: true/false`, readable triple
 *   lines for CONSTRUCT.
 * - llm: condensed Markdown (a table for SELECT, one line for ASK, a triple list
 *   for CONSTRUCT).
 * - json: the serialized {@link QueryResult}.
 */

import { quoteCall } from "../../kernel/spec/call.js";
import type { Call, Formatters, Surface } from "../../kernel/spec/index.js";

// Inline `import("…")` type (no `from`) — keeps the ke types off the static
// import graph the lazy-dispatch probe walks (see query.verb.ts).
type QueryAnswer = import("./runQuery.js").QueryAnswer;

/**
 * Render CONSTRUCT triples as readable `subject\tpredicate\tobject` lines,
 * collapsing any newlines in literal objects so each triple stays on one line.
 */
function formatTriples(
  triples: ReadonlyArray<{
    subject: string;
    predicate: string;
    object: string;
  }>,
): string {
  if (triples.length === 0) return "No triples.";
  return triples
    .map((t) => {
      const object = t.object.replace(/\s*\n\s*/g, " ").trim();
      return `${t.subject}\t${t.predicate}\t${object}`;
    })
    .join("\n");
}

/**
 * Where an empty SELECT points. Deliberately no domain tool: which one answers
 * the caller's question is the catalogue's to say, so the pointer is to the
 * catalogue — and to the namespaces that exist, since an invented prefix parses
 * and matches nothing.
 */
export const EMPTY_QUERY_CALLS = {
  catalogue: { verb: "capabilities" },
  namespaces: { verb: "ontology list" },
} as const satisfies Record<string, Call>;

/**
 * What zero rows says for itself. "No results." read as a failed tool to an
 * agent with nowhere to go next. The query RAN; when its own text declares a
 * prefix this graph does not have, that is the reason and it is said exactly.
 */
function describeEmptySelect(result: QueryAnswer, surface: Surface): string {
  const { catalogue, namespaces } = EMPTY_QUERY_CALLS;
  const invented = (result.unknownPrefixes ?? [])
    .map(
      ({ prefix, iri }) =>
        `Prefix \`${prefix}:\` <${iri}> is not a namespace of this graph, so nothing under it can match.`,
    )
    .join(" ");
  return [
    "No results: the query ran and matched nothing.",
    invented,
    `The namespaces that exist are listed by ${quoteCall(namespaces, surface)} (an invented prefix matches nothing). A domain tool may answer this without SPARQL: ${quoteCall(catalogue, surface)} lists the tools by the question each answers.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export const queryFormatters: Formatters<QueryAnswer> = {
  // Zero rows/triples: plain stdout stays empty — the notice is
  // `notice`, routed to stderr (exit 0) by the dispatcher so a pipe
  // reads no prose. ASK always has a result and never goes empty.
  notice(result, surface = "cli") {
    if (result.type === "select" && result.bindings.length === 0) {
      return describeEmptySelect(result, surface);
    }
    if (result.type === "construct" && result.triples.length === 0) {
      return "No triples.";
    }
    return undefined;
  },
  plain(result) {
    if (result.type === "select") {
      if (result.bindings.length === 0) return "";
      const cols = Object.keys(result.bindings[0] ?? {});
      const rows = result.bindings.map((b) =>
        cols.map((c) => b[c] ?? "").join("\t"),
      );
      return [cols.join("\t"), ...rows].join("\n");
    }
    if (result.type === "ask") {
      return `ASK: ${String(result.result)}`;
    }
    return result.triples.length === 0 ? "" : formatTriples(result.triples);
  },

  llm(result) {
    if (result.type === "select") {
      if (result.bindings.length === 0) {
        return describeEmptySelect(result, "cli");
      }
      const cols = Object.keys(result.bindings[0] ?? {});
      const header = `| ${cols.join(" | ")} |`;
      const divider = `| ${cols.map(() => "---").join(" | ")} |`;
      const rows = result.bindings.map(
        (b) => `| ${cols.map((c) => b[c] ?? "").join(" | ")} |`,
      );
      return [header, divider, ...rows].join("\n");
    }
    if (result.type === "ask") {
      return `**ASK** → ${String(result.result)}`;
    }
    return formatTriples(result.triples)
      .split("\n")
      .map((line) => (line.includes("\t") ? `- ${line}` : line))
      .join("\n");
  },

  json(result) {
    // The payload is the engine's own shape; the prefix finding is the notice's.
    const { unknownPrefixes: _unknownPrefixes, ...data } = result;
    return JSON.stringify(data);
  },
};
