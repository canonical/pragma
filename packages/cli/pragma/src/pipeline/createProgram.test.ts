import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runMcpServerMock = vi.fn(async () => undefined);

vi.mock("../mcp/runMcpServer.js", () => ({
  default: runMcpServerMock,
}));

describe("createProgram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("uses plain root help when llm is disabled", async () => {
    const { default: createProgram } = await import("./createProgram.js");

    const program = createProgram([], {
      cwd: "/tmp/work",
      store: {},
      config: { tier: undefined, channel: "normal" },
      globalFlags: { llm: false, format: "text", verbose: false },
    });
    const write = vi.fn();
    (
      program as {
        _events: {
          beforeAllHelp: (ctx: {
            command: unknown;
            write: (value: string) => void;
          }) => void;
        };
      }
    )._events.beforeAllHelp({ command: program, write });

    expect(write).toHaveBeenCalledWith(
      expect.stringContaining("Usage: pragma <command> [options]"),
    );
  });

  it("uses llm root help when llm is enabled", async () => {
    const { default: createProgram } = await import("./createProgram.js");

    const program = createProgram([], {
      cwd: "/tmp/work",
      store: {},
      config: { tier: undefined, channel: "normal" },
      globalFlags: { llm: true, format: "text", verbose: false },
    });
    const write = vi.fn();
    (
      program as {
        _events: {
          beforeAllHelp: (ctx: {
            command: unknown;
            write: (value: string) => void;
          }) => void;
        };
      }
    )._events.beforeAllHelp({ command: program, write });

    expect(write).toHaveBeenCalledWith(
      expect.stringContaining("# pragma commands"),
    );
  });

  it("does not inject root help text into subcommand help", async () => {
    const { default: createProgram } = await import("./createProgram.js");

    const program = createProgram([], {
      cwd: "/tmp/work",
      store: {},
      config: { tier: undefined, channel: "normal" },
      globalFlags: { llm: false, format: "text", verbose: false },
    });

    const mcpCommand = program.commands.find(
      (command) => command.name() === "mcp",
    );
    expect(mcpCommand).toBeDefined();
    const write = vi.fn();
    (
      program as {
        _events: {
          beforeAllHelp: (ctx: {
            command: unknown;
            write: (value: string) => void;
          }) => void;
        };
      }
    )._events.beforeAllHelp({ command: mcpCommand, write });
    expect(write).not.toHaveBeenCalled();
  });

  it("runs the mcp subcommand action", async () => {
    const { default: createProgram } = await import("./createProgram.js");

    const program = createProgram([], {
      cwd: "/tmp/work",
      store: {},
      config: { tier: undefined, channel: "normal" },
      globalFlags: { llm: false, format: "text", verbose: false },
    });

    await program.parseAsync(["node", "pragma", "mcp"]);

    expect(runMcpServerMock).toHaveBeenCalledTimes(1);
  });
});
