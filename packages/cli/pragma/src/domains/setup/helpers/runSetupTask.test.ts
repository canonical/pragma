import { info, pure, writeFile } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createInterfaceMock, dryRunMock, runTaskMock, runUndoMock } =
  vi.hoisted(() => ({
    createInterfaceMock: vi.fn(),
    dryRunMock: vi.fn(() => ({ effects: [] })),
    runTaskMock: vi.fn(),
    runUndoMock: vi.fn(),
  }));

async function loadRunSetupTask() {
  vi.resetModules();
  vi.doMock("node:readline", () => ({
    createInterface: createInterfaceMock,
  }));
  vi.doMock("@canonical/task", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@canonical/task")>();
    return {
      ...actual,
      dryRun: dryRunMock,
      runTask: runTaskMock,
      runUndo: runUndoMock,
    };
  });
  return (await import("./runSetupTask.js")).default;
}

import runSetupTask from "./runSetupTask.js";

describe("runSetupTask", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    vi.doUnmock("node:readline");
    vi.doUnmock("@canonical/task");
  });

  it("returns output result in dry-run mode", async () => {
    const task = writeFile("/tmp/test.txt", "hello");
    const result = await runSetupTask(task, { dryRun: true });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Dry run");
      expect(text).toContain("/tmp/test.txt");
    }
  });

  it("returns json output in dry-run + json mode", async () => {
    const task = writeFile("/tmp/test.txt", "hello");
    const result = await runSetupTask(task, {
      dryRun: true,
      format: "json",
    });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      const parsed = JSON.parse(text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].action).toBe("WriteFile");
    }
  });

  it("returns llm markdown in dry-run + llm mode", async () => {
    const task = writeFile("/tmp/test.txt", "hello");
    const result = await runSetupTask(task, { dryRun: true, llm: true });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("## Dry Run");
      expect(text).toContain("WriteFile");
    }
  });

  it("returns exit 0 on successful execution with --yes", async () => {
    const task = info("test message");
    const result = await runSetupTask(task, { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(0);
    }
  });

  it("returns exit 0 for pure task", async () => {
    const task = pure(undefined);
    const result = await runSetupTask(task, { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(0);
    }
  });

  it("shows no visible effects message for pure dry-run", async () => {
    const task = pure(undefined);
    const result = await runSetupTask(task, { dryRun: true });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("no visible effects");
    }
  });

  it("returns exit 0 in undo mode for a pure task", async () => {
    const task = pure(undefined);
    const result = await runSetupTask(task, { undo: true, yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(0);
    }
    expect(stderrSpy).toHaveBeenCalledWith("Nothing to undo.\n");
  });

  it("auto-confirms select, multiselect, confirm, and text prompts in yes mode", async () => {
    runTaskMock.mockImplementation(async (_task, options) => {
      expect(
        await options.promptHandler({
          _tag: "Prompt",
          question: { type: "confirm", default: false, message: "Continue?" },
        }),
      ).toBe(false);
      expect(
        await options.promptHandler({
          _tag: "Prompt",
          question: {
            type: "select",
            choices: [{ value: "zsh" }],
            message: "Shell?",
          },
        }),
      ).toBe("zsh");
      expect(
        await options.promptHandler({
          _tag: "Prompt",
          question: { type: "multiselect", message: "Pick many" },
        }),
      ).toEqual([]);
      expect(
        await options.promptHandler({
          _tag: "Prompt",
          question: { type: "input", message: "Name?" },
        }),
      ).toBe("");
    });

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(0);
    }
  });

  it("uses interactive confirm defaults and suppresses debug logs unless verbose", async () => {
    createInterfaceMock.mockReturnValue({
      question: (_prompt: string, cb: (answer: string) => void) => cb(""),
      close: vi.fn(),
    });
    runTaskMock.mockImplementation(async (_task, options) => {
      expect(
        await options.promptHandler({
          _tag: "Prompt",
          question: { type: "confirm", default: true, message: "Continue?" },
        }),
      ).toBe(true);
      options.onLog("debug", "hidden");
      options.onLog("info", "shown");
    });

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, {});

    expect(result.tag).toBe("exit");
    expect(stderrSpy).toHaveBeenCalledWith("shown\n");
    expect(stderrSpy).not.toHaveBeenCalledWith("hidden\n");
  });

  it("returns false for explicit negative interactive confirmation", async () => {
    createInterfaceMock.mockReturnValue({
      question: (_prompt: string, cb: (answer: string) => void) => cb("n"),
      close: vi.fn(),
    });
    runTaskMock.mockImplementation(async (_task, options) => {
      expect(
        await options.promptHandler({
          _tag: "Prompt",
          question: { type: "confirm", default: false, message: "Continue?" },
        }),
      ).toBe(false);
    });

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, {});

    expect(result.tag).toBe("exit");
  });

  it("returns exit 1 when production execution fails", async () => {
    runTaskMock.mockRejectedValue(new Error("permission denied"));

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(1);
    }
    expect(stderrSpy).toHaveBeenCalledWith("Setup failed: permission denied\n");
  });

  it("writes verbose undo logs and the singular completion message", async () => {
    runUndoMock.mockImplementation(async (_task, options) => {
      options.onLog("debug", "debug line");
      options.onLog("info", "undoing");
      return { undoCount: 1 };
    });

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, {
      undo: true,
      yes: true,
      verbose: true,
    });

    expect(result.tag).toBe("exit");
    expect(stderrSpy).toHaveBeenCalledWith("debug line\n");
    expect(stderrSpy).toHaveBeenCalledWith("undoing\n");
    expect(stderrSpy).toHaveBeenCalledWith(
      "Undo complete (1 step reversed).\n",
    );
  });

  it("writes the plural undo completion message", async () => {
    runUndoMock.mockResolvedValue({ undoCount: 2 });

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, {
      undo: true,
      yes: true,
    });

    expect(result.tag).toBe("exit");
    expect(stderrSpy).toHaveBeenCalledWith(
      "Undo complete (2 steps reversed).\n",
    );
  });

  it("returns exit 1 when undo fails", async () => {
    runUndoMock.mockRejectedValue(new Error("cannot undo"));

    const runSetupTaskWithMocks = await loadRunSetupTask();
    const result = await runSetupTaskWithMocks({} as never, {
      undo: true,
      yes: true,
    });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(1);
    }
    expect(stderrSpy).toHaveBeenCalledWith("Undo failed: cannot undo\n");
  });
});
