/**
 * Read and parse an NDJSON trace log file.
 */

import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import type { TraceRecord } from "../types.js";

export interface ReadTraceLogOptions {
  /** Absolute path to the NDJSON file. */
  path: string;
  /** Maximum number of records to return (from the tail). */
  limit?: number;
}

/** Parse NDJSON lines into TraceRecord array, skipping malformed lines. */
function parseNdjson(content: string): TraceRecord[] {
  const lines = content.split("\n").filter((line) => line.length > 0);
  const records: TraceRecord[] = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line) as TraceRecord);
    } catch {
      // Skip malformed lines
    }
  }
  return records;
}

export function readTraceLog(options: ReadTraceLogOptions): TraceRecord[] {
  const { path, limit } = options;

  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return [];
  }

  const records = parseNdjson(content);

  if (limit !== undefined) {
    // A non-positive or non-finite limit returns no records. Guard explicitly:
    // `slice(-0)` is `slice(0)` (the whole array) and `slice(NaN)` likewise
    // returns everything, so the naive `slice(-limit)` mishandles both.
    if (!Number.isFinite(limit) || limit <= 0) {
      return [];
    }
    return records.slice(-limit);
  }

  return records;
}

/**
 * Tail a trace log file, calling `onRecord` for each new record.
 * Returns a cleanup function that stops the polling loop.
 */
export function followTraceLog(
  path: string,
  onRecord: (record: TraceRecord) => void,
): () => void {
  let offset = 0;
  let stopped = false;

  try {
    const stat = statSync(path);
    offset = stat.size;
  } catch {
    // File doesn't exist yet — start from 0
  }

  const poll = () => {
    if (stopped) return;

    try {
      const stat = statSync(path);
      if (stat.size > offset) {
        const buf = Buffer.alloc(stat.size - offset);
        const fd = openSync(path, "r");
        readSync(fd, buf, 0, buf.length, offset);
        closeSync(fd);

        const chunk = buf.toString("utf-8");
        for (const record of parseNdjson(chunk)) {
          onRecord(record);
        }
        offset = stat.size;
      }
    } catch {
      // File may not exist yet or be temporarily unavailable
    }

    if (!stopped) {
      setTimeout(poll, 250);
    }
  };

  // Start polling on next tick
  setTimeout(poll, 0);

  return () => {
    stopped = true;
  };
}
