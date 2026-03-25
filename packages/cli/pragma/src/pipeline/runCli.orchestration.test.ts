import type { CommandDefinition } from "@canonical/cli-core";
import { CommanderError } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PragmaError } from "../error/index.js";

const bootPragmaMock = vi.fn();
const collectCommandsMock = vi.fn();
const createProgramMock = vi.fn();
const mapExitCodeMock = vi.fn();
const parseGlobalFlagsMock = vi.fn();
const resolveCommandKindMock = vi.fn();
const setupCommandsMock = vi.fn();
const queryCompletionsMock = vi.fn();
const startCompletionsServerMock = vi.fn();
const doctorExecuteMock = vi.fn();

vi.mock("../domains/shared/runtime.js", () => ({
  bootPragma: bootPragmaMock,
}));

vi.mock("./collectCommands.js", () => ({
  default: collectCommandsMock,
}));

vi.mock("./createProgram.js", () => ({
  default: createProgramMock,
}));

vi.mock("./mapExitCode.js", () => ({
  default: mapExitCodeMock,
}));

vi.mock("./parseGlobalFlags.js", () => ({
  default: parseGlobalFlagsMock,
}));

vi.mock("./resolveCommandKind.js", () => ({
  default: resolveCommandKindMock,
}));

vi.mock("../domains/setup/index.js", () => ({
  commands: setupCommandsMock,
}));

vi.mock("../completions/queryCompletions.js", () => ({
  default: queryCompletionsMock,
}));

vi.mock("../completions/startCompletionsServer.js", () => ({
  default: startCompletionsServerMock,
}));

vi.mock("../domains/doctor/commands/index.js", () => ({
  doctorCommand: {
    execute: doctorExecuteMock,
  },
}));

describe("runCli orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    parseGlobalFlagsMock.mockReturnValue({
      llm: false,
      format: "text",
      verbose: false,
    });
    mapExitCodeMock.mockReturnValue(17);
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("boots, parses, and disposes for store-required commands", async () => {
    const dispose = vi.fn();
    const runtime = {
      store: {},
      config: { tier: undefined, channel: "normal" },
      cwd: "/tmp",
      dispose,
    };
    const parseAsync = vi.fn(async () => undefined);

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    bootPragmaMock.mockResolvedValue(runtime);
    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "list"]);

    expect(bootPragmaMock).toHaveBeenCalledTimes(1);
    expect(collectCommandsMock).toHaveBeenCalledTimes(1);
    expect(createProgramMock).toHaveBeenCalledTimes(1);
    expect(parseAsync).toHaveBeenCalledWith([
      "node",
      "pragma",
      "block",
      "list",
    ]);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("shows root help when no command is given", async () => {
    const parseAsync = vi.fn(async () => undefined);

    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "--verbose"]);

    expect(resolveCommandKindMock).not.toHaveBeenCalled();
    expect(bootPragmaMock).not.toHaveBeenCalled();
    expect(parseAsync).toHaveBeenCalledWith(["node", "pragma", "--help"]);
  });

  it("renders boot errors and maps exit code", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    bootPragmaMock.mockRejectedValue(PragmaError.storeError("boom"));

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "list"]);

    expect(stderrSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(17);

    stderrSpy.mockRestore();
  });

  it("handles completions client early-exit", async () => {
    resolveCommandKindMock.mockReturnValue({
      kind: "completions-client",
      partial: "blo",
    });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "_complete", "blo"]);

    expect(queryCompletionsMock).toHaveBeenCalledWith("blo");
    expect(bootPragmaMock).not.toHaveBeenCalled();
  });

  it("handles completions server early-exit", async () => {
    resolveCommandKindMock.mockReturnValue({ kind: "completions-server" });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "_completions-server"]);

    expect(startCompletionsServerMock).toHaveBeenCalledTimes(1);
    expect(bootPragmaMock).not.toHaveBeenCalled();
  });

  it("handles doctor early-exit", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    resolveCommandKindMock.mockReturnValue({ kind: "doctor" });
    doctorExecuteMock.mockResolvedValue({
      tag: "output",
      value: { checks: [] },
      render: { plain: () => "doctor ok" },
    });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "doctor"]);

    expect(doctorExecuteMock).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).toHaveBeenCalledWith("doctor ok\n");

    stdoutSpy.mockRestore();
  });

  it("skips stdout when doctor returns a non-output result", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    resolveCommandKindMock.mockReturnValue({ kind: "doctor" });
    doctorExecuteMock.mockResolvedValue({ tag: "exit", code: 0 });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "doctor"]);

    expect(stdoutSpy).not.toHaveBeenCalled();

    stdoutSpy.mockRestore();
  });

  it("runs store-skip commands without booting the store", async () => {
    const parseAsync = vi.fn(async () => undefined);

    resolveCommandKindMock.mockReturnValue({ kind: "store-skip" });
    setupCommandsMock.mockReturnValue([{ path: ["setup", "skills"] }]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "setup", "skills"]);

    expect(bootPragmaMock).not.toHaveBeenCalled();
    expect(setupCommandsMock).toHaveBeenCalledTimes(1);
    expect(parseAsync).toHaveBeenCalledTimes(1);
  });

  it("maps Commander errors from the program", async () => {
    const dispose = vi.fn();
    const runtime = {
      store: {},
      config: { tier: undefined, channel: "normal" },
      cwd: "/tmp",
      dispose,
    };
    const parseAsync = vi.fn(async () => {
      throw new CommanderError(3, "commander.unknownCommand", "bad command");
    });

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    bootPragmaMock.mockResolvedValue(runtime);
    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "bad"]);

    expect(process.exitCode).toBe(3);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("treats help-displayed commander errors as success", async () => {
    const dispose = vi.fn();
    const runtime = {
      store: {},
      config: { tier: undefined, channel: "normal" },
      cwd: "/tmp",
      dispose,
    };
    const parseAsync = vi.fn(async () => {
      throw new CommanderError(0, "commander.helpDisplayed", "help");
    });

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    bootPragmaMock.mockResolvedValue(runtime);
    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "--help"]);

    expect(process.exitCode).toBe(0);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("treats version commander errors as success", async () => {
    const parseAsync = vi.fn(async () => {
      throw new CommanderError(0, "commander.version", "version");
    });

    resolveCommandKindMock.mockReturnValue({ kind: "store-skip" });
    setupCommandsMock.mockReturnValue([{ path: ["setup", "skills"] }]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "--version"]);

    expect(process.exitCode).toBe(0);
  });

  it("renders pragma errors from the program using mapped exit codes", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const dispose = vi.fn();
    const runtime = {
      store: {},
      config: { tier: undefined, channel: "normal" },
      cwd: "/tmp",
      dispose,
    };
    const parseAsync = vi.fn(async () => {
      throw PragmaError.invalidInput("tier", "bad value");
    });

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    parseGlobalFlagsMock.mockReturnValue({
      llm: true,
      format: "text",
      verbose: false,
    });
    bootPragmaMock.mockResolvedValue(runtime);
    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "get"]);

    expect(mapExitCodeMock).toHaveBeenCalledWith("INVALID_INPUT");
    expect(stderrSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(17);

    stderrSpy.mockRestore();
  });

  it("wraps unknown program errors and exits 127", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const dispose = vi.fn();
    const runtime = {
      store: {},
      config: { tier: undefined, channel: "normal" },
      cwd: "/tmp",
      dispose,
    };
    const parseAsync = vi.fn(async () => {
      throw new Error("kaboom");
    });

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    parseGlobalFlagsMock.mockReturnValue({
      llm: false,
      format: "json",
      verbose: false,
    });
    bootPragmaMock.mockResolvedValue(runtime);
    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "get"]);

    expect(stderrSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(127);
    expect(dispose).toHaveBeenCalledTimes(1);

    stderrSpy.mockRestore();
  });

  it("renders boot errors in json mode", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    parseGlobalFlagsMock.mockReturnValue({
      llm: false,
      format: "json",
      verbose: false,
    });
    bootPragmaMock.mockRejectedValue(PragmaError.storeError("boom"));

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "list"]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('"code"'));
    expect(process.exitCode).toBe(17);

    stderrSpy.mockRestore();
  });

  it("wraps non-pragma boot failures in a store error", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    parseGlobalFlagsMock.mockReturnValue({
      llm: false,
      format: "text",
      verbose: false,
    });
    bootPragmaMock.mockRejectedValue("boot exploded");

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "list"]);

    expect(mapExitCodeMock).toHaveBeenCalledWith("STORE_ERROR");
    expect(stderrSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(17);

    stderrSpy.mockRestore();
  });

  it("wraps non-error thrown values from the program and exits 127", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const dispose = vi.fn();
    const runtime = {
      store: {},
      config: { tier: undefined, channel: "normal" },
      cwd: "/tmp",
      dispose,
    };
    const parseAsync = vi.fn(async () => {
      throw "kaboom";
    });

    resolveCommandKindMock.mockReturnValue({ kind: "store-required" });
    bootPragmaMock.mockResolvedValue(runtime);
    collectCommandsMock.mockReturnValue([] as CommandDefinition[]);
    createProgramMock.mockReturnValue({ parseAsync });

    const { default: runCli } = await import("./runCli.js");
    await runCli(["node", "pragma", "block", "get"]);

    expect(stderrSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(127);
    expect(dispose).toHaveBeenCalledTimes(1);

    stderrSpy.mockRestore();
  });
});
