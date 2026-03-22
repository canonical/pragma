/**
 * Formatters for `pragma graph query` output.
 */

import type { QueryResult } from "@canonical/ke";
import type { Formatters } from "../../shared/formatters.js";

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
