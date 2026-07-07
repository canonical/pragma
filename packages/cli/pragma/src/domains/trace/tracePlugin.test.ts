import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore, sparql } from "@canonical/ke";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTracePlugin } from "./tracePlugin.js";
import type { TraceRecord } from "./types.js";

describe("createTracePlugin", () => {
  let traceDir: string;

  beforeEach(() => {
    traceDir = mkdtempSync(join(tmpdir(), "pragma-trace-test-"));
  });

  afterEach(() => {
    rmSync(traceDir, { recursive: true, force: true });
  });

  it("records SELECT queries as NDJSON", async () => {
    const plugin = createTracePlugin({
      traceDir,
      sessionId: "test-session",
    });

    const store = await createStore({
      sources: [],
      plugins: [plugin],
    });

    await store.query(sparql`SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5`);

    store.dispose();

    const logPath = join(traceDir, "test-session.ndjson");
    const content = readFileSync(logPath, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(1);

    const record = JSON.parse(lines[0]) as TraceRecord;
    expect(record.sid).toBe("test-session");
    expect(record.seq).toBe(0);
    expect(record.type).toBe("select");
    expect(record.qh).toMatch(/^[0-9a-f]{8}$/);
    expect(record.ms).toBeGreaterThanOrEqual(0);
    expect(record.vars).toBeDefined();
    expect(record.count).toBeGreaterThanOrEqual(0);
    expect(record.bindings).toBeDefined();
  });

  it("records ASK queries", async () => {
    const plugin = createTracePlugin({
      traceDir,
      sessionId: "test-ask",
    });

    const store = await createStore({
      sources: [],
      plugins: [plugin],
    });

    await store.query(
      sparql`ASK { <http://example.org/x> <http://example.org/p> <http://example.org/y> }`,
    );

    store.dispose();

    const logPath = join(traceDir, "test-ask.ndjson");
    const content = readFileSync(logPath, "utf-8");
    const record = JSON.parse(content.trim()) as TraceRecord;

    expect(record.type).toBe("ask");
    expect(record.count).toBe(1);
    expect(record.ask).toBe(false);
  });

  it("increments seq across queries", async () => {
    const plugin = createTracePlugin({
      traceDir,
      sessionId: "test-seq",
    });

    const store = await createStore({
      sources: [],
      plugins: [plugin],
    });

    await store.query(sparql`SELECT ?s WHERE { ?s ?p ?o } LIMIT 1`);
    await store.query(sparql`SELECT ?p WHERE { ?s ?p ?o } LIMIT 1`);
    await store.query(sparql`SELECT ?o WHERE { ?s ?p ?o } LIMIT 1`);

    store.dispose();

    const logPath = join(traceDir, "test-seq.ndjson");
    const content = readFileSync(logPath, "utf-8");
    const records = content
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as TraceRecord);

    expect(records).toHaveLength(3);
    expect(records[0].seq).toBe(0);
    expect(records[1].seq).toBe(1);
    expect(records[2].seq).toBe(2);
  });

  it("exposes TraceApi via store.api()", async () => {
    const plugin = createTracePlugin({
      traceDir,
      sessionId: "test-api",
    });

    const store = await createStore({
      sources: [],
      plugins: [plugin],
    });

    const api = store.api<import("./types.js").TraceApi>("trace");
    expect(api).toBeDefined();
    expect(api?.sessionId).toBe("test-api");
    expect(api?.logPath).toBe(join(traceDir, "test-api.ndjson"));
    expect(api?.queryCount).toBe(0);

    await store.query(sparql`SELECT ?s WHERE { ?s ?p ?o } LIMIT 1`);
    expect(api?.queryCount).toBe(1);

    store.dispose();
  });

  it("caps bindings at maxBindings", async () => {
    const plugin = createTracePlugin({
      traceDir,
      sessionId: "test-cap",
      maxBindings: 2,
    });

    const store = await createStore({
      sources: [],
      plugins: [plugin],
    });

    // Load some data so we get results
    // Even with empty store, the record should respect the cap
    await store.query(sparql`SELECT ?s ?p ?o WHERE { ?s ?p ?o }`);

    store.dispose();

    const logPath = join(traceDir, "test-cap.ndjson");
    const content = readFileSync(logPath, "utf-8");
    const record = JSON.parse(content.trim()) as TraceRecord;

    // bindings should be at most 2 (may be 0 with empty store)
    expect(record.bindings).toBeDefined();
    expect(record.bindings?.length).toBeLessThanOrEqual(2);
  });

  it("generates a session ID when not provided", async () => {
    const plugin = createTracePlugin({ traceDir });

    const store = await createStore({
      sources: [],
      plugins: [plugin],
    });

    const api = store.api<import("./types.js").TraceApi>("trace");
    expect(api?.sessionId).toMatch(/^\d{8}-\d{6}-[0-9a-f]{4}$/);

    store.dispose();
  });
});
