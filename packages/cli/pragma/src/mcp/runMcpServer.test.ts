import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const createMcpServerMock = vi.fn();

vi.mock("./createMcpServer.js", () => ({
  createMcpServer: createMcpServerMock,
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class StdioServerTransport {},
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("runMcpServer", () => {
  it("creates the server, connects stdio transport, and disposes on SIGINT", async () => {
    const connect = vi.fn(async () => undefined);
    const dispose = vi.fn();
    createMcpServerMock.mockResolvedValue({
      server: { connect },
      dispose,
    });

    let sigintHandler: (() => void) | undefined;
    vi.spyOn(process, "on").mockImplementation(((event, handler) => {
      if (event === "SIGINT") sigintHandler = handler as () => void;
      return process;
    }) as typeof process.on);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    const { default: runMcpServer } = await import("./runMcpServer.js");
    await runMcpServer();

    expect(createMcpServerMock).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(sigintHandler).toBeTypeOf("function");

    sigintHandler?.();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("pragma mcp subcommand starts and exits on stdin close", () => {
    const binPath = resolve(import.meta.dirname, "../bin.ts");
    const result = spawnSync("bun", ["run", binPath, "mcp"], {
      input: "",
      encoding: "utf-8",
      timeout: 20_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    if (result.status !== 0) {
      console.error("pragma mcp stderr:", result.stderr);
    }
    expect(result.status).toBe(0);
  }, 20_000);
});
