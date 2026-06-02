/**
 * KE plugin for query access tracing.
 *
 * Intercepts `onQuery` and `onResult` hooks to record every
 * `store.query()` call as an NDJSON line in a session-scoped log file.
 *
 * Activation: conditional — only instantiated when `PRAGMA_TRACE=1` or
 * `trace: true` in pragma.config.json.
 * Correlation: closure variable `pending` — safe because KE calls
 * `onQuery` → Oxigraph WASM (sync) → `onResult` with no interleaving.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { definePlugin } from "@canonical/ke";
import type { TraceApi, TracePluginOptions, TraceRecord } from "./types.js";

// ---------------------------------------------------------------------------
// FNV-1a 32-bit hash
// ---------------------------------------------------------------------------

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(input: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Session ID generation
// ---------------------------------------------------------------------------

function generateSessionId(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const rand = Math.random().toString(16).slice(2, 6);
  return `${date}-${time}-${rand}`;
}

// ---------------------------------------------------------------------------
// Record builder
// ---------------------------------------------------------------------------

function buildRecord(
  sessionId: string,
  seq: number,
  sparql: string,
  startMs: number,
  result: import("@canonical/ke").QueryResult,
  maxBindings: number,
): TraceRecord {
  const ms = Math.round((performance.now() - startMs) * 100) / 100;
  const qh = fnv1a(sparql);

  const base = {
    ts: new Date().toISOString(),
    sid: sessionId,
    seq,
    qh,
    q: sparql,
    ms,
  };

  switch (result.type) {
    case "select":
      return {
        ...base,
        type: "select",
        count: result.bindings.length,
        vars: result.variables,
        bindings: result.bindings.slice(0, maxBindings),
      };
    case "construct":
      return {
        ...base,
        type: "construct",
        count: result.triples.length,
        triples: result.triples.slice(0, maxBindings).map((t) => ({
          s: t.subject,
          p: t.predicate,
          o: t.object,
        })),
      };
    case "ask":
      return {
        ...base,
        type: "ask",
        count: 1,
        ask: result.result,
      };
  }
}

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

export function createTracePlugin(options: TracePluginOptions) {
  const maxBindings = options.maxBindings ?? 200;
  const sessionId = options.sessionId ?? generateSessionId();
  const logPath = join(options.traceDir, `${sessionId}.ndjson`);

  let seq = 0;
  let pendingQuery: string | undefined;
  let pendingStart: number | undefined;

  return definePlugin<TraceApi>({
    name: "trace",

    onReady() {
      mkdirSync(options.traceDir, { recursive: true });
      return {
        sessionId,
        logPath,
        get queryCount() {
          return seq;
        },
      };
    },

    onQuery(sparql) {
      pendingQuery = sparql;
      pendingStart = performance.now();
      return undefined;
    },

    onResult(result) {
      if (pendingQuery !== undefined && pendingStart !== undefined) {
        const record = buildRecord(
          sessionId,
          seq,
          pendingQuery,
          pendingStart,
          result,
          maxBindings,
        );
        appendFileSync(logPath, `${JSON.stringify(record)}\n`);
        seq++;
        pendingQuery = undefined;
        pendingStart = undefined;
      }
      return undefined;
    },
  });
}
