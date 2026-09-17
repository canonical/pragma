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

import { type Call, renderCall, type Surface } from "../../kernel/spec/call.js";
import type { Formatters } from "../../kernel/spec/index.js";

// Inline `import("…")` type (no `from`) — keeps the ke types off the static
// import graph the lazy-dispatch probe walks (see query.verb.ts).
type QueryResult = import("@canonical/ke").QueryResult;

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
 * Where an empty SELECT points: the entity the caller expected to match, and
 * the namespaces its query named. The `uri` is a placeholder by necessity — the
 * query knows what it asked for, not which entity the caller had in mind.
 */
export const EMPTY_QUERY_CALLS = {
  inspect: { verb: "graph inspect", params: { uri: "<prefix:name>" } },
  namespaces: { verb: "ontology list" },
} as const satisfies Record<string, Call>;

/**
 * What zero rows says for itself. "No results." read as a failed tool to an
 * agent with nowhere to go next; the query RAN, and the likeliest causes are a
 * term the graph spells differently or a prefix it does not bind.
 */
function describeEmptySelect(surface: Surface): string {
  const { inspect, namespaces } = EMPTY_QUERY_CALLS;
  return `No results: the query ran and nothing matched. Look at an entity you expected to match with \`${renderCall(inspect, surface)}\`, and check the namespaces the query names with \`${renderCall(namespaces, surface)}\`.`;
}

export const queryFormatters: Formatters<QueryResult> = {
  // Zero rows/triples: plain stdout stays empty — the notice is
  // `notice`, routed to stderr (exit 0) by the dispatcher so a pipe
  // reads no prose. ASK always has a result and never goes empty.
  notice(result, surface = "cli") {
    if (result.type === "select" && result.bindings.length === 0) {
      return describeEmptySelect(surface);
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
      if (result.bindings.length === 0) return describeEmptySelect("cli");
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
    return JSON.stringify(result);
  },
};
