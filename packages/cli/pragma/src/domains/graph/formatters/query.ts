import type { QueryResult } from "@canonical/ke";
import type { Formatters } from "../../shared/formatters.js";

/**
 * Formatters for `pragma graph query` output.
 *
 * - **plain**: tab-separated table for SELECT results, `ASK: true/false` for ASK
 *   queries, JSON fallback for CONSTRUCT.
 * - **llm**: indented JSON for all query types.
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
    return JSON.stringify(result, null, 2);
  },

  llm(result) {
    return JSON.stringify(result, null, 2);
  },

  json(result) {
    return JSON.stringify(result, null, 2);
  },
};

export default formatters;
