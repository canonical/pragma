import { answerPromptWithDefaults } from "@canonical/cli-core";
import { pure, type Task, writeFile } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import runSetupTask from "./runSetupTask.js";

const {
  runGeneratorTaskMock,
  runUndoMock,
  sessionAnswerMock,
  sessionDisposeMock,
} = vi.hoisted(() => ({
  runGeneratorTaskMock: vi.fn(),
  runUndoMock: vi.fn(),
  sessionAnswerMock: vi.fn(),
  sessionDisposeMock: vi.fn(),
}));

// runSetupTask orchestrates: dry-run/undo use real formatting and runUndo,
// while production runs through the shared execution core. Mock the core,
// runUndo, and the interactive prompt session, so the wiring and lifecycle
// stay under test with real effect formatting.
vi.mock("@canonical/cli-core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@canonical/cli-core")>()),
  runGeneratorTask: runGeneratorTaskMock,
}));

vi.mock("@canonical/task", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@canonical/task")>()),
  runUndo: runUndoMock,
}));

vi.mock("../../shared/createInteractivePromptSession.js", () => ({
  default: () => ({
    answerPrompt: sessionAnswerMock,
    wasInterrupted: () => false,
    dispose: sessionDisposeMock,
  }),
}));

const succeed = async (): Promise<undefined> => undefined;

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
  });

  // ===========================================================================
  // Dry-run mode
  // ===========================================================================

  it("returns output result in dry-run mode", async () => {
    const result = await runSetupTask(writeFile("/tmp/test.txt", "hello"), {
      dryRun: true,
    });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Dry run");
      expect(text).toContain("/tmp/test.txt");
    }
    expect(runGeneratorTaskMock).not.toHaveBeenCalled();
  });

  it("returns json output in dry-run + json mode", async () => {
    const result = await runSetupTask(writeFile("/tmp/test.txt", "hello"), {
      dryRun: true,
      format: "json",
    });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const parsed = JSON.parse(result.render.plain(result.value));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].action).toBe("WriteFile");
    }
  });

  it("returns llm markdown in dry-run + llm mode", async () => {
    const result = await runSetupTask(writeFile("/tmp/test.txt", "hello"), {
      dryRun: true,
      llm: true,
    });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toContain("Dry Run");
    }
  });

  it("shows the no-visible-effects message when a dry-run collects none", async () => {
    const result = await runSetupTask(pure(undefined) as Task<void>, {
      dryRun: true,
      verbose: false,
    });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toContain("no visible effects");
    }
  });

  // ===========================================================================
  // Production execution — through the shared execution core
  // ===========================================================================

  it("runs production through the shared execution core and returns exit 0", async () => {
    runGeneratorTaskMock.mockImplementation(succeed);

    const result = await runSetupTask(writeFile("/tmp/x", "y"), { yes: true });

    expect(runGeneratorTaskMock).toHaveBeenCalledTimes(1);
    expect(result.tag).toBe("exit");
    if (result.tag === "exit") expect(result.code).toBe(0);
  });

  it("wires the auto-confirm handler in yes mode", async () => {
    runGeneratorTaskMock.mockImplementation(async (_task, options) => {
      expect(options.promptHandler).toBe(answerPromptWithDefaults);
      return succeed();
    });

    await runSetupTask(writeFile("/tmp/x", "y"), { yes: true });
    expect(runGeneratorTaskMock).toHaveBeenCalledTimes(1);
  });

  it("wires an interactive prompt session when not in yes mode and disposes it", async () => {
    runGeneratorTaskMock.mockImplementation(async (_task, options) => {
      expect(options.promptHandler).toBe(sessionAnswerMock);
      expect(sessionDisposeMock).not.toHaveBeenCalled();
      return succeed();
    });

    await runSetupTask(writeFile("/tmp/x", "y"), {});
    expect(runGeneratorTaskMock).toHaveBeenCalledTimes(1);
    expect(sessionDisposeMock).toHaveBeenCalledTimes(1);
  });

  it("disposes the prompt session even when production execution fails", async () => {
    runGeneratorTaskMock.mockRejectedValue(new Error("boom"));

    const result = await runSetupTask(writeFile("/tmp/x", "y"), {});

    expect(result.tag).toBe("exit");
    expect(sessionDisposeMock).toHaveBeenCalledTimes(1);
  });

  it("suppresses debug logs unless verbose during production", async () => {
    runGeneratorTaskMock.mockImplementation(async (_task, options) => {
      options.onLog("debug", "hidden");
      options.onLog("info", "shown");
      return succeed();
    });

    await runSetupTask(writeFile("/tmp/x", "y"), { yes: true });

    expect(stderrSpy).toHaveBeenCalledWith("shown\n");
    expect(stderrSpy).not.toHaveBeenCalledWith("hidden\n");
  });

  it("emits debug logs when verbose during production", async () => {
    runGeneratorTaskMock.mockImplementation(async (_task, options) => {
      options.onLog("debug", "shown-debug");
      return succeed();
    });

    await runSetupTask(writeFile("/tmp/x", "y"), { yes: true, verbose: true });
    expect(stderrSpy).toHaveBeenCalledWith("shown-debug\n");
  });

  it("returns exit 1 when production execution fails", async () => {
    runGeneratorTaskMock.mockRejectedValue(new Error("permission denied"));

    const result = await runSetupTask(writeFile("/tmp/x", "y"), { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") expect(result.code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith("Setup failed: permission denied\n");
  });

  it("stringifies a non-Error production rejection", async () => {
    runGeneratorTaskMock.mockRejectedValue("raw failure");

    const result = await runSetupTask(writeFile("/tmp/x", "y"), { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") expect(result.code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith("Setup failed: raw failure\n");
  });

  // ===========================================================================
  // Undo mode
  // ===========================================================================

  it("reports nothing to undo when no undos are collected", async () => {
    runUndoMock.mockResolvedValue({ undoCount: 0 });

    const result = await runSetupTask(writeFile("/tmp/x", "y"), {
      undo: true,
      yes: true,
    });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") expect(result.code).toBe(0);
    expect(stderrSpy).toHaveBeenCalledWith("Nothing to undo.\n");
  });

  it("writes verbose undo logs and the singular completion message", async () => {
    runUndoMock.mockImplementation(async (_task, options) => {
      options.onLog("debug", "debug line");
      options.onLog("info", "undoing");
      return { undoCount: 1 };
    });

    const result = await runSetupTask(writeFile("/tmp/x", "y"), {
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

    const result = await runSetupTask(writeFile("/tmp/x", "y"), {
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

    const result = await runSetupTask(writeFile("/tmp/x", "y"), {
      undo: true,
      yes: true,
    });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") expect(result.code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith("Undo failed: cannot undo\n");
  });

  it("stringifies a non-Error undo rejection", async () => {
    runUndoMock.mockRejectedValue("raw undo failure");

    const result = await runSetupTask(writeFile("/tmp/x", "y"), {
      undo: true,
      yes: true,
    });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") expect(result.code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith("Undo failed: raw undo failure\n");
  });
});
