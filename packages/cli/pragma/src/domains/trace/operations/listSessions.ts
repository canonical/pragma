/**
 * List available trace sessions from the trace directory.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { TraceSession } from "../types.js";

export function listSessions(traceDir: string): TraceSession[] {
  let entries: string[];
  try {
    entries = readdirSync(traceDir);
  } catch {
    return [];
  }

  const sessions: TraceSession[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".ndjson")) continue;

    const sessionId = entry.replace(/\.ndjson$/, "");
    const filePath = join(traceDir, entry);

    try {
      const stat = statSync(filePath);
      const content = readFileSync(filePath, "utf-8");
      const lineCount = content.split("\n").filter((l) => l.length > 0).length;

      sessions.push({
        sessionId,
        path: filePath,
        queryCount: lineCount,
        sizeBytes: stat.size,
        createdAt: stat.birthtime,
      });
    } catch {
      // Skip files we can't stat/read
    }
  }

  // Sort by session ID descending (newest first — IDs are timestamp-based)
  sessions.sort((a, b) => b.sessionId.localeCompare(a.sessionId));

  return sessions;
}
