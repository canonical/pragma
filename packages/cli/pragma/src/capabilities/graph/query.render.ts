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

import type { Formatters } from "../../kernel/spec/types.js";

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

export const queryFormatters: Formatters<QueryResult> = {
  plain(result) {
    if (result.type === "select") {
      if (result.bindings.length === 0) return "No results.";
      const cols = Object.keys(result.bindings[0] ?? {});
      const rows = result.bindings.map((b) =>
        cols.map((c) => b[c] ?? "").join("\t"),
      );
      return [cols.join("\t"), ...rows].join("\n");
    }
    if (result.type === "ask") {
      return `ASK: ${String(result.result)}`;
    }
    return formatTriples(result.triples);
  },

  llm(result) {
    if (result.type === "select") {
      if (result.bindings.length === 0) return "_No results._";
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
