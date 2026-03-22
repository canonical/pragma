import { beforeEach, describe, expect, it, vi } from "vitest";

const runSetupTaskMock = vi.fn();
const setupAllMock = vi.fn(() => ({ task: "all" }));
const setupCompletionsMock = vi.fn((shell?: string) => ({
  task: "completions",
  shell,
}));
const setupLspMock = vi.fn((cwd: string) => ({ task: "lsp", cwd }));
const setupMcpMock = vi.fn((cwd: string, harness?: string) => ({
  task: "mcp",
  cwd,
  harness,
}));

vi.mock("../helpers/runSetupTask.js", () => ({
  default: runSetupTaskMock,
}));

vi.mock("../operations/setupAll.js", () => ({
  default: setupAllMock,
}));

vi.mock("../operations/setupCompletions.js", () => ({
  default: setupCompletionsMock,
}));

vi.mock("../operations/setupLsp.js", () => ({
  default: setupLspMock,
}));

vi.mock("../operations/setupMcp.js", () => ({
  default: setupMcpMock,
}));

describe("setup command entrypoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runSetupTaskMock.mockResolvedValue({ tag: "exit", code: 0 });
  });

  it("maps setup all flags into runSetupTask", async () => {
    const { default: allCommand } = await import("./all.js");

    await allCommand.execute(
      { dryRun: true, undo: true, yes: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: true, format: "json", verbose: true },
      },
    );

    expect(setupAllMock).toHaveBeenCalledWith("/workspace");
    expect(runSetupTaskMock).toHaveBeenCalledWith(
      { task: "all" },
      {
        dryRun: true,
        undo: true,
        yes: true,
        verbose: true,
        llm: true,
        format: "json",
      },
    );
  });

  it("resolves zsh, bash, fish, and default completion targets", async () => {
    const { default: completionsCommand } = await import("./completions.js");

    await completionsCommand.execute(
      { zsh: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    await completionsCommand.execute(
      { bash: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    await completionsCommand.execute(
      { fish: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    await completionsCommand.execute(
      {},
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );

    expect(setupCompletionsMock).toHaveBeenNthCalledWith(1, "zsh");
    expect(setupCompletionsMock).toHaveBeenNthCalledWith(2, "bash");
    expect(setupCompletionsMock).toHaveBeenNthCalledWith(3, "fish");
    expect(setupCompletionsMock).toHaveBeenNthCalledWith(4, undefined);
  });

  it("resolves harness-specific and default mcp setup", async () => {
    const { default: mcpCommand } = await import("./mcp.js");

    await mcpCommand.execute(
      { claudeCode: true, yes: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    await mcpCommand.execute(
      { cursor: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    await mcpCommand.execute(
      { windsurf: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    await mcpCommand.execute(
      {},
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );

    expect(setupMcpMock).toHaveBeenNthCalledWith(
      1,
      "/workspace",
      "claude-code",
    );
    expect(setupMcpMock).toHaveBeenNthCalledWith(2, "/workspace", "cursor");
    expect(setupMcpMock).toHaveBeenNthCalledWith(3, "/workspace", "windsurf");
    expect(setupMcpMock).toHaveBeenNthCalledWith(4, "/workspace", undefined);
  });

  it("passes cwd and flags through setup lsp", async () => {
    const { default: lspCommand } = await import("./lsp.js");

    await lspCommand.execute(
      { dryRun: true, undo: true },
      {
        cwd: "/workspace",
        globalFlags: { llm: true, format: "json", verbose: true },
      },
    );

    expect(setupLspMock).toHaveBeenCalledWith("/workspace");
    expect(runSetupTaskMock).toHaveBeenCalledWith(
      { task: "lsp", cwd: "/workspace" },
      {
        dryRun: true,
        undo: true,
        verbose: true,
        llm: true,
        format: "json",
      },
    );
  });
});
