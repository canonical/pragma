import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import waitForSocket from "./waitForSocket.js";

describe("waitForSocket", () => {
  it("returns true immediately when file exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-ws-"));
    const path = join(dir, "test.sock");
    writeFileSync(path, "");

    try {
      const result = await waitForSocket(path, 1_000);
      expect(result).toBe(true);
    } finally {
      unlinkSync(path);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns false after timeout when file does not exist", async () => {
    const path = "/tmp/pragma-test-nonexistent-socket.sock";
    const result = await waitForSocket(path, 200);
    expect(result).toBe(false);
  });
});
