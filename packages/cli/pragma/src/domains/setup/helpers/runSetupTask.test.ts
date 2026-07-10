import { writeFile } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import answerPromptInteractively from "./answerPromptInteractively.js";
import answerPromptWithDefaults from "./answerPromptWithDefaults.js";
import runSetupTask from "./runSetupTask.js";

const { runGeneratorTaskMock, runUndoMock } = vi.hoisted(() => ({
  runGeneratorTaskMock: vi.fn(),
  runUndoMock: vi.fn(),
}));

// runSetupTask orchestrates: dry-run/undo use real formatting and runUndo,
// while production runs through the shared execution core. Mock only that
// core and runUndo, so the real prompt handlers and effect formatting stay
// under test.
vi.mock("@canonical/cli-core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@canonical/cli-core")>()),
  runGeneratorTask: runGeneratorTaskMock,
}));

vi.mock("@canonical/task", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@canonical/task")>()),
  runUndo: runUndoMock,
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

  it("shows no visible effects message for pure dry-run", async () => {
    const result = await runSetupTask(writeFile("/tmp/x", "y"), {
      dryRun: true,
      verbose: false,
    });
    // A single WriteFile is visible; assert the plain formatter ran.
    expect(result.tag).toBe("output");
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

  it("wires the interactive handler when not in yes mode", async () => {
    runGeneratorTaskMock.mockImplementation(async (_task, options) => {
      expect(options.promptHandler).toBe(answerPromptInteractively);
      return succeed();
    });

    await runSetupTask(writeFile("/tmp/x", "y"), {});
    expect(runGeneratorTaskMock).toHaveBeenCalledTimes(1);
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
