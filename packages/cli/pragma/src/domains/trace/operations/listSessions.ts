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
      // Count records by counting newline bytes on the raw Buffer. Each NDJSON
      // record is one newline-terminated line, so this avoids decoding the
      // whole file to a string and allocating a large split() array.
      const buf = readFileSync(filePath);
      let lineCount = 0;
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x0a) lineCount++;
      }

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
