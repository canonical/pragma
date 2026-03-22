import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const existsSyncMock = vi.fn();
const unlinkSyncMock = vi.fn();
const computeSocketPathMock = vi.fn(() => "/tmp/pragma-completions.sock");
const querySocketMock = vi.fn();
const waitForSocketMock = vi.fn();
const spawnMock = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
  unlinkSync: unlinkSyncMock,
}));

vi.mock("./computeSocketPath.js", () => ({
  default: computeSocketPathMock,
}));

vi.mock("./querySocket.js", () => ({
  default: querySocketMock,
}));

vi.mock("./waitForSocket.js", () => ({
  default: waitForSocketMock,
}));

describe("queryCompletions", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    vi.stubGlobal("Bun", { spawn: spawnMock });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("uses an existing server and prints results", async () => {
    existsSyncMock.mockReturnValue(true);
    querySocketMock.mockResolvedValue("block\nstandard");

    const { default: queryCompletions } = await import("./queryCompletions.js");
    await queryCompletions("blo");

    expect(querySocketMock).toHaveBeenCalledWith(
      "/tmp/pragma-completions.sock",
      "blo",
    );
    expect(stdoutSpy).toHaveBeenCalledWith("block\nstandard\n");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("cleans up a stale socket, spawns a server, and retries", async () => {
    existsSyncMock.mockReturnValue(true);
    querySocketMock
      .mockRejectedValueOnce(new Error("stale socket"))
      .mockResolvedValueOnce("block");
    waitForSocketMock.mockResolvedValue(true);

    const { default: queryCompletions } = await import("./queryCompletions.js");
    await queryCompletions("blo");

    expect(unlinkSyncMock).toHaveBeenCalledWith("/tmp/pragma-completions.sock");
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(waitForSocketMock).toHaveBeenCalled();
    expect(querySocketMock).toHaveBeenCalledTimes(2);
    expect(stdoutSpy).toHaveBeenCalledWith("block\n");
  });

  it("returns silently when the spawned server never becomes ready", async () => {
    existsSyncMock.mockReturnValue(false);
    waitForSocketMock.mockResolvedValue(false);

    const { default: queryCompletions } = await import("./queryCompletions.js");
    await queryCompletions("blo");

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(querySocketMock).not.toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("swallows post-spawn query errors and empty responses", async () => {
    existsSyncMock.mockReturnValue(false);
    waitForSocketMock.mockResolvedValue(true);
    querySocketMock
      .mockResolvedValueOnce("")
      .mockRejectedValueOnce(new Error("boom"));

    const { default: queryCompletions } = await import("./queryCompletions.js");
    await queryCompletions("blo");
    await queryCompletions("blo");

    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
