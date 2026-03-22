import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_TIMEOUT_MS } from "./constants.js";

const existsSyncMock = vi.fn();
const unlinkSyncMock = vi.fn();
const buildCompletersMock = vi.fn(() => ({ root: true }));
const bootPragmaMock = vi.fn();
const collectCommandsMock = vi.fn(() => []);
const computeSocketPathMock = vi.fn(() => "/tmp/pragma-completions.sock");
const handleQueryMock = vi.fn();
const listenMock = vi.fn();
const stopMock = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
  unlinkSync: unlinkSyncMock,
}));

vi.mock("@canonical/cli-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@canonical/cli-core")>();
  return {
    ...actual,
    buildCompleters: buildCompletersMock,
  };
});

vi.mock("../domains/shared/runtime.js", () => ({
  bootPragma: bootPragmaMock,
}));

vi.mock("../pipeline/collectCommands.js", () => ({
  default: collectCommandsMock,
}));

vi.mock("./computeSocketPath.js", () => ({
  default: computeSocketPathMock,
}));

vi.mock("./handleQuery.js", () => ({
  default: handleQueryMock,
}));

describe("startCompletionsServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    stopMock.mockReset();
    listenMock.mockReset();
    listenMock.mockReturnValue({ stop: stopMock });
    vi.stubGlobal("Bun", { listen: listenMock });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("boots, removes stale sockets, and handles incoming queries", async () => {
    existsSyncMock.mockReturnValue(true);
    const dispose = vi.fn();
    bootPragmaMock.mockResolvedValue({
      cwd: "/workspace",
      store: {},
      config: { tier: undefined, channel: "normal" },
      dispose,
    });
    handleQueryMock.mockResolvedValue("block\nstandard");

    const { default: startCompletionsServer } = await import(
      "./startCompletionsServer.js"
    );
    await startCompletionsServer();

    expect(unlinkSyncMock).toHaveBeenCalledWith("/tmp/pragma-completions.sock");
    expect(buildCompletersMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledTimes(1);

    const listenConfig = listenMock.mock.calls[0]?.[0] as {
      socket: {
        data: (
          socket: { write: (value: string) => void; end: () => void },
          rawData: Uint8Array,
        ) => Promise<void>;
      };
    };
    const socket = { write: vi.fn(), end: vi.fn() };

    await listenConfig.socket.data(socket, Buffer.from("blo\n"));

    expect(handleQueryMock).toHaveBeenCalledWith(
      "blo",
      { root: true },
      expect.objectContaining({
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      }),
    );
    expect(socket.write).toHaveBeenCalledWith("block\nstandard");
    expect(socket.end).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
  });

  it("disposes and exits after the idle timeout", async () => {
    existsSyncMock.mockReturnValue(false);
    const dispose = vi.fn();
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    bootPragmaMock.mockResolvedValue({
      cwd: "/workspace",
      store: {},
      config: { tier: undefined, channel: "normal" },
      dispose,
    });

    const { default: startCompletionsServer } = await import(
      "./startCompletionsServer.js"
    );
    await startCompletionsServer();

    vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(unlinkSyncMock).toHaveBeenCalledWith("/tmp/pragma-completions.sock");
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });
});
