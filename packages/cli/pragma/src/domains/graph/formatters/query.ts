import type { QueryResult } from "@canonical/ke";
import type { Formatters } from "../../shared/formatters.js";

/**
 * Render CONSTRUCT triples as readable `subject  predicate  object` lines,
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
 * Formatters for `pragma graph query` output.
 *
 * - **plain**: tab-separated table for SELECT, `ASK: true/false` for ASK, and
 *   readable triple lines for CONSTRUCT.
 * - **llm**: condensed Markdown (table for SELECT, one line for ASK, a triple
 *   list for CONSTRUCT) rather than a raw JSON dump.
 * - **json**: serialized {@link QueryResult} as indented JSON.
 */
const formatters: Formatters<QueryResult> = {
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
    return JSON.stringify(result, null, 2);
  },
};

export default formatters;
