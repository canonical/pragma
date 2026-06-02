import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listSessions } from "./listSessions.js";

describe("listSessions", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-trace-sessions-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns empty array for nonexistent directory", () => {
    const result = listSessions("/nonexistent/path");
    expect(result).toEqual([]);
  });

  it("returns empty array for empty directory", () => {
    const result = listSessions(dir);
    expect(result).toEqual([]);
  });

  it("lists .ndjson files as sessions", () => {
    writeFileSync(join(dir, "20260512-143022-a7f3.ndjson"), '{"seq":0}\n');
    writeFileSync(
      join(dir, "20260512-140100-b8e2.ndjson"),
      '{"seq":0}\n{"seq":1}\n',
    );
    // Non-ndjson file should be ignored
    writeFileSync(join(dir, "notes.txt"), "ignore me");

    const result = listSessions(dir);

    expect(result).toHaveLength(2);
    // Sorted newest first
    expect(result[0].sessionId).toBe("20260512-143022-a7f3");
    expect(result[1].sessionId).toBe("20260512-140100-b8e2");
    expect(result[0].queryCount).toBe(1);
    expect(result[1].queryCount).toBe(2);
    expect(result[0].sizeBytes).toBeGreaterThan(0);
  });

  it("ignores non-ndjson files", () => {
    writeFileSync(join(dir, "readme.md"), "# traces");
    writeFileSync(join(dir, ".hidden"), "secret");

    const result = listSessions(dir);
    expect(result).toEqual([]);
  });
});
