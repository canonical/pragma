/**
 * Types for query access tracing.
 *
 * One NDJSON record per `store.query()` call. The trace plugin writes
 * these to session-scoped log files; the CLI reads them back.
 */

/** A single trace record — one per store.query() call. */
export interface TraceRecord {
  /** ISO-8601 timestamp. */
  ts: string;
  /** Session identifier. */
  sid: string;
  /** Monotonic query index within the session. */
  seq: number;
  /** FNV-1a hash of the query string (8 hex chars). */
  qh: string;
  /** SPARQL query string (after prefix expansion). */
  q: string;
  /** Execution duration in milliseconds. */
  ms: number;
  /** Result type discriminant. */
  type: "select" | "construct" | "ask";
  /** True result count (bindings / triples / 1). */
  count: number;
  /** SELECT variable names. */
  vars?: string[];
  /** SELECT result rows (capped at maxBindings). */
  bindings?: Record<string, string>[];
  /** CONSTRUCT triples (capped at maxBindings). */
  triples?: { s: string; p: string; o: string }[];
  /** ASK result. */
  ask?: boolean;
}

/** API exposed via `store.api<TraceApi>("trace")`. */
export interface TraceApi {
  readonly sessionId: string;
  readonly logPath: string;
  readonly queryCount: number;
}

/** Options for creating the trace plugin. */
export interface TracePluginOptions {
  /** Directory for trace log files. */
  traceDir: string;
  /** Session identifier (generated if omitted). */
  sessionId?: string;
  /** Max bindings/triples to record per query. Default: 200. */
  maxBindings?: number;
}

/** A trace session on disk. */
export interface TraceSession {
  /** Session identifier (derived from filename). */
  sessionId: string;
  /** Absolute path to the NDJSON file. */
  path: string;
  /** Number of query records in the file. */
  queryCount: number;
  /** File size in bytes. */
  sizeBytes: number;
  /** File creation time. */
  createdAt: Date;
}
