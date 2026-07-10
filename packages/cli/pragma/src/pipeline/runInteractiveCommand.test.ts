import type { CommandDefinition, InteractiveSpec } from "@canonical/cli-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sessionAnswerMock, sessionDisposeMock } = vi.hoisted(() => ({
  sessionAnswerMock: vi.fn(),
  sessionDisposeMock: vi.fn(),
}));

vi.mock("../domains/shared/createInteractivePromptSession.js", () => ({
  default: () => ({
    answerPrompt: sessionAnswerMock,
    dispose: sessionDisposeMock,
  }),
}));

const { default: runInteractiveCommand } = await import(
  "./runInteractiveCommand.js"
);

const spec: InteractiveSpec = {
  generator: {
    meta: { name: "test-gen", version: "1.0.0" },
    prompts: [
      { name: "name", message: "Component name", type: "text" },
      {
        name: "withTests",
        message: "Include tests?",
        type: "confirm",
        default: true,
      },
    ],
    generate: () => ({}),
  },
  partialAnswers: {},
  options: { dryRunOnly: false, undo: false, verbose: false, preview: true },
};

const makeCommand = (
  execute: CommandDefinition["execute"],
): CommandDefinition =>
  ({
    path: ["create", "test-gen"],
    description: "",
    parameters: [],
    execute,
  }) as CommandDefinition;

const ctx = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text" as const, verbose: false },
};

describe("runInteractiveCommand", () => {
  let ttySpies: Array<() => void>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  const setTty = (value: boolean): void => {
    for (const stream of [process.stdin, process.stdout] as const) {
      const original = stream.isTTY;
      stream.isTTY = value;
      ttySpies.push(() => {
        stream.isTTY = original;
      });
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ttySpies = [];
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    for (const restore of ttySpies) restore();
    stderrSpy.mockRestore();
  });

  it("returns null outside an interactive terminal", async () => {
    setTty(false);
    const execute = vi.fn();

    const result = await runInteractiveCommand({
      spec,
      command: makeCommand(execute),
      params: {},
      ctx,
    });

    expect(result).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it("collects answers through the prompt session and executes in batch mode", async () => {
    setTty(true);
    sessionAnswerMock.mockImplementation((effect) =>
      Promise.resolve(effect.question.name === "name" ? "Button" : false),
    );
    const execute = vi.fn().mockResolvedValue({ tag: "exit", code: 0 });

    const result = await runInteractiveCommand({
      spec,
      command: makeCommand(execute),
      params: { verbose: true },
      ctx,
    });

    expect(sessionAnswerMock).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledWith(
      { verbose: true, name: "Button", withTests: false, yes: true },
      ctx,
    );
    expect(result).toEqual({ tag: "exit", code: 0 });
    expect(sessionDisposeMock).toHaveBeenCalledTimes(1);
  });

  it("does not re-ask prompts answered by CLI flags", async () => {
    setTty(true);
    sessionAnswerMock.mockResolvedValue(true);
    const execute = vi.fn().mockResolvedValue({ tag: "exit", code: 0 });

    await runInteractiveCommand({
      spec: { ...spec, partialAnswers: { name: "Card" } },
      command: makeCommand(execute),
      params: {},
      ctx,
    });

    expect(sessionAnswerMock).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      { name: "Card", withTests: true, yes: true },
      ctx,
    );
  });

  it("disposes the session even when a prompt fails", async () => {
    setTty(true);
    sessionAnswerMock.mockRejectedValue(new Error("interrupted"));
    const execute = vi.fn();

    await expect(
      runInteractiveCommand({
        spec,
        command: makeCommand(execute),
        params: {},
        ctx,
      }),
    ).rejects.toThrow();

    expect(sessionDisposeMock).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });
});
