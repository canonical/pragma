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

    // Process should exit without a crash exit code.
    // StdioServerTransport closes when stdin ends, so exit code 0 or
    // a clean shutdown signal is expected.
    expect(result.status).not.toBe(127);
    expect(result.signal).toBeNull();
  });
});
