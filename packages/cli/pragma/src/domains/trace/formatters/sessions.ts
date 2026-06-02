/**
 * Three-mode formatter for `pragma trace sessions` output.
 */

import type { Formatters } from "../../shared/formatters.js";
import type { TraceSession } from "../types.js";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const formatters: Formatters<TraceSession[]> = {
  plain: (sessions) => {
    if (sessions.length === 0) {
      return "No trace sessions found.";
    }

    const lines: string[] = [];
    const hdr = {
      sid: "SESSION",
      queries: "QUERIES",
      size: "SIZE",
      age: "AGE",
    };
    const sidW = Math.max(
      hdr.sid.length,
      ...sessions.map((s) => s.sessionId.length),
    );

    lines.push(
      `${hdr.sid.padEnd(sidW)}  ${hdr.queries.padStart(7)}  ${hdr.size.padStart(8)}  ${hdr.age}`,
    );

    for (const s of sessions) {
      lines.push(
        `${s.sessionId.padEnd(sidW)}  ${String(s.queryCount).padStart(7)}  ${formatSize(s.sizeBytes).padStart(8)}  ${formatAge(s.createdAt)}`,
      );
    }

    return lines.join("\n");
  },

  llm: (sessions) => {
    if (sessions.length === 0) {
      return "No trace sessions found.";
    }

    const lines: string[] = [];
    lines.push("## Trace Sessions");
    lines.push("");
    lines.push("| Session | Queries | Size | Age |");
    lines.push("|---------|---------|------|-----|");

    for (const s of sessions) {
      lines.push(
        `| ${s.sessionId} | ${s.queryCount} | ${formatSize(s.sizeBytes)} | ${formatAge(s.createdAt)} |`,
      );
    }

    return lines.join("\n");
  },

  json: (sessions) => JSON.stringify(sessions, null, 2),
};

export default formatters;
