import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TraceRecord } from "../types.js";
import { readTraceLog } from "./readTraceLog.js";

function makeRecord(seq: number): TraceRecord {
  return {
    ts: new Date().toISOString(),
    sid: "test-session",
    seq,
    qh: "abcd1234",
    q: `SELECT ?x WHERE { ?x ?p ?o } LIMIT ${seq + 1}`,
    ms: seq * 1.5,
    type: "select",
    count: seq + 1,
    vars: ["x"],
    bindings: [{ x: `http://example.org/${seq}` }],
  };
}

describe("readTraceLog", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-trace-read-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("parses NDJSON records", () => {
    const path = join(dir, "test.ndjson");
    const records = [makeRecord(0), makeRecord(1), makeRecord(2)];
    writeFileSync(path, records.map((r) => JSON.stringify(r)).join("\n"));

    const result = readTraceLog({ path });

    expect(result).toHaveLength(3);
    expect(result[0].seq).toBe(0);
    expect(result[1].seq).toBe(1);
    expect(result[2].seq).toBe(2);
  });

  it("returns empty array for missing file", () => {
    const result = readTraceLog({ path: join(dir, "nonexistent.ndjson") });
    expect(result).toEqual([]);
  });

  it("skips malformed lines", () => {
    const path = join(dir, "malformed.ndjson");
    writeFileSync(
      path,
      [
        JSON.stringify(makeRecord(0)),
        "not json",
        JSON.stringify(makeRecord(1)),
      ].join("\n"),
    );

    const result = readTraceLog({ path });

    expect(result).toHaveLength(2);
    expect(result[0].seq).toBe(0);
    expect(result[1].seq).toBe(1);
  });

  it("respects limit (returns last N records)", () => {
    const path = join(dir, "limited.ndjson");
    const records = Array.from({ length: 10 }, (_, i) => makeRecord(i));
    writeFileSync(path, records.map((r) => JSON.stringify(r)).join("\n"));

    const result = readTraceLog({ path, limit: 3 });

    expect(result).toHaveLength(3);
    expect(result[0].seq).toBe(7);
    expect(result[1].seq).toBe(8);
    expect(result[2].seq).toBe(9);
  });

  it("returns all records when limit exceeds count", () => {
    const path = join(dir, "small.ndjson");
    writeFileSync(path, JSON.stringify(makeRecord(0)));

    const result = readTraceLog({ path, limit: 100 });

    expect(result).toHaveLength(1);
  });

  it("returns empty array when limit is 0", () => {
    const path = join(dir, "zero.ndjson");
    writeFileSync(path, JSON.stringify(makeRecord(0)));

    const result = readTraceLog({ path, limit: 0 });

    expect(result).toHaveLength(0);
  });
});
