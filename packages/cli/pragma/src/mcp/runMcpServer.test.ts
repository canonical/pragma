import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runMcpServer", () => {
  it("pragma mcp subcommand starts and exits on stdin close", () => {
    const binPath = resolve(import.meta.dirname, "../bin.ts");
    const result = spawnSync("bun", ["run", binPath, "mcp"], {
      input: "",
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
  });
});
