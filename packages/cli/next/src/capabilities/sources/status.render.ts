/**
 * Formatters for `pragma sources status` — plain, llm, json.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { SourcesStatusData } from "./types.js";

const STALENESS_MARK: Record<string, string> = {
  "up-to-date": "ok",
  "config-drift": "config drift",
  uncached: "not built",
};

export const statusFormatters: Formatters<SourcesStatusData> = {
  plain(data) {
    const lines = [
      data.lockPresent
        ? `Store: ${data.cached ? "ready" : "locked but not cached"}`
        : "Store: no lock (run `pragma sources update`)",
    ];
    if (data.cached) {
      lines.push(
        `  pack: ${data.contentHash?.slice(0, 12)} — ${data.entityCount ?? "?"} entities, built ${data.builtAt ?? "?"}`,
      );
    }
    lines.push("", "Sources:");
    if (data.sources.length === 0) {
      lines.push("  (none configured)");
    }
    for (const source of data.sources) {
      const resolved = source.resolved
        ? ` @ ${source.resolved.slice(0, 12)}`
        : "";
      lines.push(
        `  ${source.name} [${STALENESS_MARK[source.staleness]}]${resolved}`,
      );
    }
    return lines.join("\n");
  },

  llm(data) {
    const lines = [
      `# sources`,
      `- Store: ${data.lockPresent ? (data.cached ? "ready" : "locked, not cached") : "no lock"}`,
      ...(data.cached ? [`- Entities: ${data.entityCount ?? "?"}`] : []),
    ];
    for (const source of data.sources) {
      lines.push(`- ${source.name}: ${source.staleness}`);
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
