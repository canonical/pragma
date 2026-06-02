/**
 * Three-mode formatter for `pragma trace` output.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { TraceRecord } from "../types.js";

export interface ShowData {
  sessionId: string;
  records: TraceRecord[];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join(":");
}

function formatResultSummary(record: TraceRecord): string {
  switch (record.type) {
    case "select":
      return `${record.count} row${record.count !== 1 ? "s" : ""}`;
    case "construct":
      return `${record.count} triple${record.count !== 1 ? "s" : ""}`;
    case "ask":
      return record.ask ? "true" : "false";
  }
}

function totalDuration(records: TraceRecord[]): string {
  const total = records.reduce((sum, r) => sum + r.ms, 0);
  if (total < 1000) return `${Math.round(total)}ms`;
  return `${(total / 1000).toFixed(1)}s`;
}

function truncateQuery(query: string, maxLen = 120): string {
  // Collapse whitespace for display
  const collapsed = query.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLen) return collapsed;
  return `${collapsed.slice(0, maxLen - 3)}...`;
}

const formatters: Formatters<ShowData> = {
  plain: ({ sessionId, records }) => {
    if (records.length === 0) {
      return `Session ${sessionId}  (no queries)`;
    }

    const lines: string[] = [];
    lines.push(
      `Session ${sessionId}  (${records.length} quer${records.length === 1 ? "y" : "ies"}, ${totalDuration(records)})`,
    );
    lines.push("");

    for (const r of records) {
      const seqStr = `#${r.seq}`.padEnd(5);
      const time = formatTime(r.ts);
      const type = r.type.toUpperCase().padEnd(10);
      const summary = formatResultSummary(r).padEnd(12);
      const ms = `${r.ms}ms`.padEnd(9);

      lines.push(`${seqStr} ${time}  ${type}${summary}${ms} ${r.qh}`);
      lines.push(`      ${truncateQuery(r.q)}`);
      lines.push("");
    }

    return lines.join("\n");
  },

  llm: ({ sessionId, records }) => {
    if (records.length === 0) {
      return `## Trace: ${sessionId}\n\nNo queries recorded.`;
    }

    const lines: string[] = [];
    lines.push(
      `## Trace: ${sessionId} (${records.length} queries, ${totalDuration(records)})`,
    );
    lines.push("");
    lines.push("| # | Type | Count | ms | Hash | Query |");
    lines.push("|---|------|-------|----|------|-------|");

    for (const r of records) {
      lines.push(
        `| ${r.seq} | ${r.type} | ${formatResultSummary(r)} | ${r.ms} | ${r.qh} | \`${truncateQuery(r.q, 80)}\` |`,
      );
    }

    return lines.join("\n");
  },

  json: ({ sessionId, records }) =>
    JSON.stringify({ sessionId, records }, null, 2),
};

export default formatters;
