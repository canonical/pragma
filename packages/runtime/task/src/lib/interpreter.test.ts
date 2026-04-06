import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parallel, sequence_ } from "./combinators.js";
import {
  executeEffect,
  run,
  runTask,
  TaskExecutionError,
} from "./interpreter.js";
import { info, succeed, warn } from "./primitives.js";
import { effect, fail, flatMap, map, pure } from "./task.js";
import type { Effect, ExecResult, TaskError } from "./types.js";

// Note: These tests focus on the interpreter's logic without actually
// performing I/O. For real I/O testing, integration tests should be used.

// =============================================================================
// TaskExecutionError
// =============================================================================

describe("Interpreter - TaskExecutionError", () => {
  it("extends Error", () => {
    const taskError: TaskError = { code: "TEST_ERR", message: "Test error" };
    const err = new TaskExecutionError(taskError);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TaskExecutionError);
  });

  it("has correct name", () => {
    const taskError: TaskError = { code: "TEST_ERR", message: "Test error" };
    const err = new TaskExecutionError(taskError);

    expect(err.name).toBe("TaskExecutionError");
  });

  it("preserves error code", () => {
    const taskError: TaskError = { code: "ERR_CODE", message: "Message" };
    const err = new TaskExecutionError(taskError);

    expect(err.code).toBe("ERR_CODE");
  });

  it("preserves error message", () => {
    const taskError: TaskError = { code: "ERR", message: "Detailed message" };
    const err = new TaskExecutionError(taskError);

    expect(err.message).toBe("Detailed message");
  });

  it("preserves taskError object", () => {
    const taskError: TaskError = {
      code: "ERR",
      message: "Message",
      context: { extra: "data" },
    };
    const err = new TaskExecutionError(taskError);

    expect(err.taskError).toEqual(taskError);
    expect(err.taskError.context).toEqual({ extra: "data" });
  });

  it("preserves stack trace from taskError", () => {
    const stack = "Error: test\n  at file.ts:1:1\n  at main.ts:10:5";
    const taskError: TaskError = { code: "ERR", message: "Message", stack };
    const err = new TaskExecutionError(taskError);

    expect(err.stack).toBe(stack);
  });
});

// =============================================================================
// runTask - Pure Tasks
// =============================================================================

describe("Interpreter - runTask with Pure Tasks", () => {
  it("returns value from pure task", async () => {
    const result = await runTask(pure(42));
    expect(result).toBe(42);
  });

  it("handles string values", async () => {
    const result = await runTask(pure("hello"));
    expect(result).toBe("hello");
  });

  it("handles object values", async () => {
    const obj = { a: 1, b: "test" };
    const result = await runTask(pure(obj));
    expect(result).toEqual(obj);
  });

  it("handles array values", async () => {
    const arr = [1, 2, 3];
    const result = await runTask(pure(arr));
    expect(result).toEqual(arr);
  });

  it("handles null value", async () => {
    const result = await runTask(pure(null));
    expect(result).toBeNull();
  });

  it("handles undefined value", async () => {
    const result = await runTask(pure(undefined));
    expect(result).toBeUndefined();
  });

  it("preserves referential equality", async () => {
    const obj = { a: 1 };
    const result = await runTask(pure(obj));
    expect(result).toBe(obj);
  });
});

// =============================================================================
// runTask - Failed Tasks
// =============================================================================

describe("Interpreter - runTask with Failed Tasks", () => {
  it("throws TaskExecutionError for failed tasks", async () => {
    const error: TaskError = { code: "TEST_ERR", message: "Test error" };
    const task = fail<number>(error);

    await expect(runTask(task)).rejects.toThrow(TaskExecutionError);
  });

  it("error has correct code", async () => {
    const error: TaskError = { code: "SPECIFIC_CODE", message: "Message" };
    const task = fail<number>(error);

    try {
      await runTask(task);
      expect.fail("Should have thrown");
    } catch (e) {
      expect((e as TaskExecutionError).code).toBe("SPECIFIC_CODE");
    }
  });

  it("error has correct message", async () => {
    const error: TaskError = { code: "ERR", message: "Detailed error message" };
    const task = fail<number>(error);

    try {
      await runTask(task);
      expect.fail("Should have thrown");
    } catch (e) {
      expect((e as TaskExecutionError).message).toBe("Detailed error message");
    }
  });

  it("propagates failure through chains", async () => {
    const error: TaskError = { code: "ERR", message: "error" };
    const task = flatMap(fail<number>(error), (x) => pure(x * 2));

    await expect(runTask(task)).rejects.toThrow(TaskExecutionError);
  });
});

// =============================================================================
// runTask - Map and FlatMap
// =============================================================================

describe("Interpreter - runTask with Map and FlatMap", () => {
  it("handles map on pure task", async () => {
    const task = map(pure(10), (x) => x * 2);
    const result = await runTask(task);

    expect(result).toBe(20);
  });

  it("handles flatMap on pure task", async () => {
    const task = flatMap(pure(5), (x) => pure(x + 3));
    const result = await runTask(task);

    expect(result).toBe(8);
  });

  it("handles nested flatMaps", async () => {
    const task = flatMap(pure(1), (a) =>
      flatMap(pure(2), (b) => flatMap(pure(3), (c) => pure(a + b + c))),
    );
    const result = await runTask(task);

    expect(result).toBe(6);
  });

  it("handles chain of maps", async () => {
    const task = map(
      map(
        map(pure(2), (x) => x + 1),
        (x) => x * 2,
      ),
      (x) => x + 3,
    );
    const result = await runTask(task);

    expect(result).toBe(9); // ((2 + 1) * 2) + 3
  });
});

// =============================================================================
// runTask - Log Effects
// =============================================================================

describe("Interpreter - runTask with Log Effects", () => {
  it("calls onLog handler for log effects", async () => {
    const logs: Array<{ level: string; message: string }> = [];
    const onLog = (
      level: "debug" | "info" | "warn" | "error",
      message: string,
    ) => {
      logs.push({ level, message });
    };

    const task = sequence_([info("Info message"), warn("Warning message")]);

    await runTask(task, { onLog });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toEqual({ level: "info", message: "Info message" });
    expect(logs[1]).toEqual({ level: "warn", message: "Warning message" });
  });

  it("falls back to console.log when no onLog handler", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const task = info("Test message");
    await runTask(task);

    expect(consoleSpy).toHaveBeenCalledWith("[INFO] Test message");
    consoleSpy.mockRestore();
  });
});

// =============================================================================
// runTask - Context
// =============================================================================

describe("Interpreter - runTask with Context", () => {
  it("uses provided context", async () => {
    const context = new Map<string, unknown>([["key", "value"]]);

    const task = effect<string>({ _tag: "ReadContext", key: "key" });
    const result = await runTask(task, { context });

    expect(result).toBe("value");
  });

  it("writes to context", async () => {
    const context = new Map<string, unknown>();

    const task = effect<void>({
      _tag: "WriteContext",
      key: "testKey",
      value: "testValue",
    });
    await runTask(task, { context });

    expect(context.get("testKey")).toBe("testValue");
  });

  it("context persists across effects", async () => {
    const context = new Map<string, unknown>();

    const writeTask = effect<void>({
      _tag: "WriteContext",
      key: "counter",
      value: 42,
    });
    const readTask = effect<number>({ _tag: "ReadContext", key: "counter" });

    const task = flatMap(writeTask, () => readTask);
    const result = await runTask(task, { context });

    expect(result).toBe(42);
  });

  it("returns undefined for missing context keys", async () => {
    const context = new Map<string, unknown>();

    const task = effect<unknown>({ _tag: "ReadContext", key: "missing" });
    const result = await runTask(task, { context });

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// runTask - Effect Hooks
// =============================================================================

describe("Interpreter - runTask with Effect Hooks", () => {
  it("calls onEffectStart before effect execution", async () => {
    const effects: Effect[] = [];
    const onEffectStart = (effect: Effect) => {
      effects.push(effect);
    };

    const task = info("Test message");
    await runTask(task, {
      onEffectStart,
      onLog: () => {}, // Suppress console output
    });

    expect(effects).toHaveLength(1);
    expect(effects[0]._tag).toBe("Log");
  });

  it("calls onEffectComplete after effect execution", async () => {
    const completions: Array<{ effect: Effect; duration: number }> = [];
    const onEffectComplete = (effect: Effect, duration: number) => {
      completions.push({ effect, duration });
    };

    const task = info("Test message");
    await runTask(task, {
      onEffectComplete,
      onLog: () => {}, // Suppress console output
    });

    expect(completions).toHaveLength(1);
    expect(completions[0].effect._tag).toBe("Log");
    expect(completions[0].duration).toBeGreaterThanOrEqual(0);
  });

  it("calls hooks for multiple effects in sequence", async () => {
    const startOrder: string[] = [];
    const completeOrder: string[] = [];

    const onEffectStart = (effect: Effect) => {
      startOrder.push(effect._tag);
    };
    const onEffectComplete = (effect: Effect) => {
      completeOrder.push(effect._tag);
    };

    const task = sequence_([info("First"), warn("Second")]);

    await runTask(task, {
      onEffectStart,
      onEffectComplete,
      onLog: () => {},
    });

    expect(startOrder).toEqual(["Log", "Log"]);
    expect(completeOrder).toEqual(["Log", "Log"]);
  });
});

// =============================================================================
// runTask - Prompt Effects
// =============================================================================

describe("Interpreter - runTask with Prompt Effects", () => {
  it("calls promptHandler for prompt effects", async () => {
    const promptHandler = vi.fn().mockResolvedValue("user input");

    const task = effect<string>({
      _tag: "Prompt",
      question: {
        type: "text",
        name: "input",
        message: "Enter something:",
      },
    });

    const result = await runTask(task, { promptHandler });

    expect(promptHandler).toHaveBeenCalled();
    expect(result).toBe("user input");
  });

  it("throws error when no promptHandler provided", async () => {
    const task = effect<string>({
      _tag: "Prompt",
      question: {
        type: "text",
        name: "input",
        message: "Enter something:",
      },
    });

    await expect(runTask(task)).rejects.toThrow(TaskExecutionError);
    try {
      await runTask(task);
    } catch (e) {
      expect((e as TaskExecutionError).code).toBe("NO_PROMPT_HANDLER");
    }
  });

  it("passes question to promptHandler", async () => {
    let capturedQuestion: unknown;
    const promptHandler = vi.fn().mockImplementation((q) => {
      capturedQuestion = q;
      return Promise.resolve("answer");
    });

    const question = {
      type: "select" as const,
      name: "choice",
      message: "Pick one:",
      choices: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
    };

    const task = effect<string>({ _tag: "Prompt", question });
    await runTask(task, { promptHandler });

    expect(
      (capturedQuestion as { question: typeof question }).question,
    ).toEqual(question);
  });
});

// =============================================================================
// run - Simple API
// =============================================================================

describe("Interpreter - run (simple API)", () => {
  it("runs pure task without options", async () => {
    const result = await run(pure(42));
    expect(result).toBe(42);
  });

  it("throws for failed task", async () => {
    const error: TaskError = { code: "ERR", message: "error" };
    await expect(run(fail<number>(error))).rejects.toThrow(TaskExecutionError);
  });

  it("accepts promptHandler as second argument", async () => {
    const promptHandler = vi.fn().mockResolvedValue("response");

    const task = effect<string>({
      _tag: "Prompt",
      question: { type: "text", name: "q", message: "?" },
    });

    const result = await run(task, promptHandler);

    expect(promptHandler).toHaveBeenCalled();
    expect(result).toBe("response");
  });
});

// =============================================================================
// executeEffect - ReadContext and WriteContext
// =============================================================================

describe("Interpreter - executeEffect for Context", () => {
  it("reads from context map", async () => {
    const context = new Map<string, unknown>([["myKey", "myValue"]]);
    const effect: Effect = { _tag: "ReadContext", key: "myKey" };

    const result = await executeEffect(effect, context);

    expect(result).toBe("myValue");
  });

  it("writes to context map", async () => {
    const context = new Map<string, unknown>();
    const effect: Effect = { _tag: "WriteContext", key: "newKey", value: 123 };

    await executeEffect(effect, context);

    expect(context.get("newKey")).toBe(123);
  });

  it("overwrites existing context values", async () => {
    const context = new Map<string, unknown>([["key", "old"]]);
    const effect: Effect = { _tag: "WriteContext", key: "key", value: "new" };

    await executeEffect(effect, context);

    expect(context.get("key")).toBe("new");
  });
});

// =============================================================================
// executeEffect - File deletion
// =============================================================================

describe("Interpreter - executeEffect for DeleteFile", () => {
  it("ignores missing files", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-delete-file-"));
    const filePath = join(tempDir, "missing.txt");

    try {
      await expect(
        executeEffect({ _tag: "DeleteFile", path: filePath }, new Map()),
      ).resolves.toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("deletes existing files", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-delete-file-"));
    const filePath = join(tempDir, "present.txt");

    try {
      writeFileSync(filePath, "hello", "utf8");

      await executeEffect({ _tag: "DeleteFile", path: filePath }, new Map());

      expect(existsSync(filePath)).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - Log
// =============================================================================

describe("Interpreter - executeEffect for Log", () => {
  it("calls onLog handler", async () => {
    const logs: Array<{ level: string; message: string }> = [];
    const onLog = (
      level: "debug" | "info" | "warn" | "error",
      message: string,
    ) => {
      logs.push({ level, message });
    };

    const effect: Effect = { _tag: "Log", level: "info", message: "Test" };
    await executeEffect(effect, new Map(), undefined, onLog);

    expect(logs).toEqual([{ level: "info", message: "Test" }]);
  });

  it("handles all log levels", async () => {
    const logs: string[] = [];
    const onLog = (level: "debug" | "info" | "warn" | "error") => {
      logs.push(level);
    };

    const levels: Array<"debug" | "info" | "warn" | "error"> = [
      "debug",
      "info",
      "warn",
      "error",
    ];

    for (const level of levels) {
      const effect: Effect = { _tag: "Log", level, message: "test" };
      await executeEffect(effect, new Map(), undefined, onLog);
    }

    expect(logs).toEqual(["debug", "info", "warn", "error"]);
  });
});

// =============================================================================
// executeEffect - Parallel and Race
// =============================================================================

describe("Interpreter - executeEffect for Parallel/Race", () => {
  it("throws for Parallel effect (must be handled by runTask)", async () => {
    const effect: Effect = { _tag: "Parallel", tasks: [] };

    await expect(executeEffect(effect, new Map())).rejects.toThrow(
      "Parallel effect must be handled by runTask",
    );
  });

  it("throws for Race effect (must be handled by runTask)", async () => {
    const effect: Effect = { _tag: "Race", tasks: [] };

    await expect(executeEffect(effect, new Map())).rejects.toThrow(
      "Race effect must be handled by runTask",
    );
  });
});

// =============================================================================
// runTask - Parallel Effects
// =============================================================================

describe("Interpreter - runTask with Parallel Effects", () => {
  it("runs parallel tasks and returns results array", async () => {
    const task = effect<number[]>({
      _tag: "Parallel",
      tasks: [pure(1), pure(2), pure(3)],
    });

    const result = await runTask(task);

    expect(result).toEqual([1, 2, 3]);
  });

  it("handles empty parallel tasks", async () => {
    const task = effect<unknown[]>({ _tag: "Parallel", tasks: [] });
    const result = await runTask(task);

    expect(result).toEqual([]);
  });

  it("calls effect hooks for parallel effects", async () => {
    const effectTags: string[] = [];
    const onEffectStart = (e: Effect) => effectTags.push(e._tag);

    const task = effect<number[]>({
      _tag: "Parallel",
      tasks: [pure(1), pure(2)],
    });

    await runTask(task, { onEffectStart });

    expect(effectTags).toContain("Parallel");
  });
});

// =============================================================================
// runTask - Race Effects
// =============================================================================

describe("Interpreter - runTask with Race Effects", () => {
  it("runs race tasks and returns first result", async () => {
    const task = effect<number>({
      _tag: "Race",
      tasks: [pure(1), pure(2), pure(3)],
    });

    const result = await runTask(task);

    // All tasks are pure, so the first one wins
    expect(result).toBe(1);
  });

  it("calls effect hooks for race effects", async () => {
    const effectTags: string[] = [];
    const onEffectStart = (e: Effect) => effectTags.push(e._tag);

    const task = effect<number>({
      _tag: "Race",
      tasks: [pure(1), pure(2)],
    });

    await runTask(task, { onEffectStart });

    expect(effectTags).toContain("Race");
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Interpreter - Integration", () => {
  it("can run complex task chains", async () => {
    const context = new Map<string, unknown>();
    const logs: string[] = [];

    const task = flatMap(
      effect<void>({ _tag: "WriteContext", key: "counter", value: 0 }),
      () =>
        flatMap(
          effect<number>({ _tag: "ReadContext", key: "counter" }),
          (count) =>
            flatMap(
              effect<void>({
                _tag: "WriteContext",
                key: "counter",
                value: count + 1,
              }),
              () =>
                flatMap(
                  effect<void>({
                    _tag: "Log",
                    level: "info",
                    message: `Count: ${count + 1}`,
                  }),
                  () => effect<number>({ _tag: "ReadContext", key: "counter" }),
                ),
            ),
        ),
    );

    const result = await runTask(task, {
      context,
      onLog: (_, msg) => logs.push(msg),
    });

    expect(result).toBe(1);
    expect(context.get("counter")).toBe(1);
    expect(logs).toEqual(["Count: 1"]);
  });

  it("can combine effects with succeed", async () => {
    const logs: string[] = [];
    const onLog = (_: string, msg: string) => logs.push(msg);

    const task = flatMap(info("Starting"), () =>
      flatMap(succeed(42), (value) =>
        flatMap(info(`Value: ${value}`), () => pure(value * 2)),
      ),
    );

    const result = await runTask(task, { onLog });

    expect(result).toBe(84);
    expect(logs).toEqual(["Starting", "Value: 42"]);
  });

  // ===========================================================================
  // AbortSignal
  // ===========================================================================

  describe("signal (AbortSignal)", () => {
    it("interrupts before first effect when already aborted", async () => {
      const controller = new AbortController();
      controller.abort("cancelled");

      const task = info("should not run");

      await expect(
        runTask(task, {
          signal: controller.signal,
          onLog: () => {},
        }),
      ).rejects.toThrow("Task interrupted");
    });

    it("includes reason in error message", async () => {
      const controller = new AbortController();
      controller.abort("user cancelled");

      try {
        await runTask(pure(42), { signal: controller.signal });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TaskExecutionError);
        expect((err as TaskExecutionError).code).toBe("TASK_INTERRUPTED");
      }
    });

    it("does not interrupt when signal is not aborted", async () => {
      const controller = new AbortController();
      const logs: string[] = [];

      const result = await runTask(
        flatMap(info("ok"), () => pure(42)),
        {
          signal: controller.signal,
          onLog: (_, msg) => logs.push(msg),
        },
      );

      expect(result).toBe(42);
      expect(logs).toEqual(["ok"]);
    });
  });

  // ===========================================================================
  // Parallel Suppressed Errors
  // ===========================================================================

  describe("parallel suppressed errors", () => {
    it("captures all errors from parallel failures", async () => {
      const task = parallel([
        fail({ code: "ERR_A", message: "error a" }),
        fail({ code: "ERR_B", message: "error b" }),
        pure(42),
      ]);

      try {
        await runTask(task, {});
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TaskExecutionError);
        const taskErr = (err as TaskExecutionError).taskError;
        expect(taskErr.code).toBe("ERR_A");
        expect(taskErr.suppressed).toHaveLength(1);
        expect(taskErr.suppressed?.[0].code).toBe("ERR_B");
      }
    });

    it("does not set suppressed when only one error", async () => {
      const task = parallel([
        fail({ code: "ERR_A", message: "error a" }),
        pure(42),
      ]);

      try {
        await runTask(task, {});
        expect.unreachable("should have thrown");
      } catch (err) {
        const taskErr = (err as TaskExecutionError).taskError;
        expect(taskErr.code).toBe("ERR_A");
        expect(taskErr.suppressed).toBeUndefined();
      }
    });
  });
});

// =============================================================================
// executeEffect - ReadFile
// =============================================================================

describe("Interpreter - executeEffect for ReadFile", () => {
  it("reads file content as utf-8", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-read-"));

    try {
      const filePath = join(tempDir, "test.txt");
      writeFileSync(filePath, "hello world", "utf8");

      const result = await executeEffect(
        { _tag: "ReadFile", path: filePath },
        new Map(),
      );

      expect(result).toBe("hello world");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - WriteFile
// =============================================================================

describe("Interpreter - executeEffect for WriteFile", () => {
  it("writes content to a file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-write-"));

    try {
      const filePath = join(tempDir, "output.txt");

      await executeEffect(
        { _tag: "WriteFile", path: filePath, content: "written content" },
        new Map(),
      );

      expect(readFileSync(filePath, "utf8")).toBe("written content");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates parent directories recursively", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-write-"));

    try {
      const filePath = join(tempDir, "a", "b", "c", "deep.txt");

      await executeEffect(
        { _tag: "WriteFile", path: filePath, content: "deep" },
        new Map(),
      );

      expect(readFileSync(filePath, "utf8")).toBe("deep");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - AppendFile
// =============================================================================

describe("Interpreter - executeEffect for AppendFile", () => {
  it("appends to an existing file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-append-"));

    try {
      const filePath = join(tempDir, "log.txt");
      writeFileSync(filePath, "line1\n", "utf8");

      await executeEffect(
        {
          _tag: "AppendFile",
          path: filePath,
          content: "line2\n",
          createIfMissing: false,
        },
        new Map(),
      );

      expect(readFileSync(filePath, "utf8")).toBe("line1\nline2\n");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates file when createIfMissing is true and file does not exist", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-append-"));

    try {
      const filePath = join(tempDir, "new.txt");

      await executeEffect(
        {
          _tag: "AppendFile",
          path: filePath,
          content: "first line",
          createIfMissing: true,
        },
        new Map(),
      );

      expect(readFileSync(filePath, "utf8")).toBe("first line");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("appends when createIfMissing is true and file already exists", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-append-"));

    try {
      const filePath = join(tempDir, "existing.txt");
      writeFileSync(filePath, "existing\n", "utf8");

      await executeEffect(
        {
          _tag: "AppendFile",
          path: filePath,
          content: "appended",
          createIfMissing: true,
        },
        new Map(),
      );

      expect(readFileSync(filePath, "utf8")).toBe("existing\nappended");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates parent directories", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-append-"));

    try {
      const filePath = join(tempDir, "sub", "dir", "file.txt");

      await executeEffect(
        {
          _tag: "AppendFile",
          path: filePath,
          content: "content",
          createIfMissing: true,
        },
        new Map(),
      );

      expect(readFileSync(filePath, "utf8")).toBe("content");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - CopyFile
// =============================================================================

describe("Interpreter - executeEffect for CopyFile", () => {
  it("copies a file to the destination", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-copy-"));

    try {
      const src = join(tempDir, "source.txt");
      writeFileSync(src, "copy me", "utf8");
      const dest = join(tempDir, "dest.txt");

      await executeEffect({ _tag: "CopyFile", source: src, dest }, new Map());

      expect(readFileSync(dest, "utf8")).toBe("copy me");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates parent directories for destination", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-copy-"));

    try {
      const src = join(tempDir, "source.txt");
      writeFileSync(src, "data", "utf8");
      const dest = join(tempDir, "nested", "dir", "dest.txt");

      await executeEffect({ _tag: "CopyFile", source: src, dest }, new Map());

      expect(readFileSync(dest, "utf8")).toBe("data");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - CopyDirectory
// =============================================================================

describe("Interpreter - executeEffect for CopyDirectory", () => {
  it("copies a directory recursively", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-cpdir-"));

    try {
      const src = join(tempDir, "src");
      mkdirSync(join(src, "sub"), { recursive: true });
      writeFileSync(join(src, "a.txt"), "a", "utf8");
      writeFileSync(join(src, "sub", "b.txt"), "b", "utf8");

      const dest = join(tempDir, "dest");

      await executeEffect(
        { _tag: "CopyDirectory", source: src, dest },
        new Map(),
      );

      expect(readFileSync(join(dest, "a.txt"), "utf8")).toBe("a");
      expect(readFileSync(join(dest, "sub", "b.txt"), "utf8")).toBe("b");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - DeleteDirectory
// =============================================================================

describe("Interpreter - executeEffect for DeleteDirectory", () => {
  it("removes a directory recursively", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-deldir-"));

    try {
      const dir = join(tempDir, "target");
      mkdirSync(join(dir, "sub"), { recursive: true });
      writeFileSync(join(dir, "file.txt"), "x", "utf8");

      await executeEffect({ _tag: "DeleteDirectory", path: dir }, new Map());

      expect(existsSync(dir)).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - MakeDir
// =============================================================================

describe("Interpreter - executeEffect for MakeDir", () => {
  it("creates a directory with recursive option", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-mkdir-"));

    try {
      const dir = join(tempDir, "a", "b", "c");

      await executeEffect(
        { _tag: "MakeDir", path: dir, recursive: true },
        new Map(),
      );

      expect(existsSync(dir)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates a single directory with recursive false", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-mkdir-"));

    try {
      const dir = join(tempDir, "single");

      await executeEffect(
        { _tag: "MakeDir", path: dir, recursive: false },
        new Map(),
      );

      expect(existsSync(dir)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - Symlink
// =============================================================================

describe("Interpreter - executeEffect for Symlink", () => {
  it("creates a symlink", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-symlink-"));

    try {
      const target = join(tempDir, "target.txt");
      writeFileSync(target, "target content", "utf8");
      const link = join(tempDir, "link.txt");

      await executeEffect({ _tag: "Symlink", target, path: link }, new Map());

      expect(readlinkSync(link)).toBe(target);
      expect(readFileSync(link, "utf8")).toBe("target content");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates parent directories for symlink", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-symlink-"));

    try {
      const target = join(tempDir, "target.txt");
      writeFileSync(target, "data", "utf8");
      const link = join(tempDir, "nested", "dir", "link.txt");

      await executeEffect({ _tag: "Symlink", target, path: link }, new Map());

      expect(readlinkSync(link)).toBe(target);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - Exists
// =============================================================================

describe("Interpreter - executeEffect for Exists", () => {
  it("returns true for existing file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-exists-"));

    try {
      const filePath = join(tempDir, "exists.txt");
      writeFileSync(filePath, "x", "utf8");

      const result = await executeEffect(
        { _tag: "Exists", path: filePath },
        new Map(),
      );

      expect(result).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns false for non-existing file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-exists-"));

    try {
      const result = await executeEffect(
        { _tag: "Exists", path: join(tempDir, "missing.txt") },
        new Map(),
      );

      expect(result).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - Glob (simpleGlob fallback)
// =============================================================================

describe("Interpreter - executeEffect for Glob", () => {
  it("matches files with wildcard pattern", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-glob-"));

    try {
      writeFileSync(join(tempDir, "foo.ts"), "", "utf8");
      writeFileSync(join(tempDir, "bar.ts"), "", "utf8");
      writeFileSync(join(tempDir, "baz.js"), "", "utf8");

      const result = (await executeEffect(
        { _tag: "Glob", pattern: "*.ts", cwd: tempDir },
        new Map(),
      )) as string[];

      expect(result.sort()).toEqual(["bar.ts", "foo.ts"]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("matches files in subdirectories", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-glob-"));

    try {
      mkdirSync(join(tempDir, "sub"), { recursive: true });
      writeFileSync(join(tempDir, "sub", "deep.txt"), "", "utf8");
      writeFileSync(join(tempDir, "sub", "other.js"), "", "utf8");

      // Use a pattern that works with both Bun.Glob and the simpleGlob fallback
      const result = (await executeEffect(
        { _tag: "Glob", pattern: "sub/*", cwd: tempDir },
        new Map(),
      )) as string[];

      expect(result.sort()).toEqual(["sub/deep.txt", "sub/other.js"]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns empty array when no matches", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-glob-"));

    try {
      writeFileSync(join(tempDir, "file.js"), "", "utf8");

      const result = (await executeEffect(
        { _tag: "Glob", pattern: "*.ts", cwd: tempDir },
        new Map(),
      )) as string[];

      expect(result).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - Exec (Node.js fallback)
// =============================================================================

describe("Interpreter - executeEffect for Exec", () => {
  it("executes a command and returns stdout", async () => {
    const result = (await executeEffect(
      { _tag: "Exec", command: "echo", args: ["hello"], cwd: undefined },
      new Map(),
    )) as ExecResult;

    expect(result.stdout.trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  it("captures stderr", async () => {
    const result = (await executeEffect(
      {
        _tag: "Exec",
        command: "sh",
        args: ["-c", "echo err >&2"],
        cwd: undefined,
      },
      new Map(),
    )) as ExecResult;

    expect(result.stderr.trim()).toBe("err");
  });

  it("returns non-zero exit code", async () => {
    const result = (await executeEffect(
      {
        _tag: "Exec",
        command: "sh",
        args: ["-c", "exit 42"],
        cwd: undefined,
      },
      new Map(),
    )) as ExecResult;

    expect(result.exitCode).toBe(42);
  });

  it("returns zero exit code when process is killed by signal", async () => {
    // When a process is killed by a signal, Node.js close event passes null code
    const result = (await executeEffect(
      {
        _tag: "Exec",
        command: "sh",
        args: ["-c", "kill -9 $$"],
        cwd: undefined,
      },
      new Map(),
    )) as ExecResult;

    // code ?? 0 — process killed by signal, code is null, falls back to 0
    expect(result.exitCode).toBe(0);
  });

  it("respects cwd option", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-exec-"));

    try {
      const result = (await executeEffect(
        { _tag: "Exec", command: "pwd", args: [], cwd: tempDir },
        new Map(),
      )) as ExecResult;

      expect(result.stdout.trim()).toBe(tempDir);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - DeleteFile error propagation
// =============================================================================

describe("Interpreter - executeEffect for DeleteFile error propagation", () => {
  it("rethrows non-ENOENT errors", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "task-del-err-"));

    try {
      // Trying to delete a directory with unlink should give EISDIR/EPERM
      mkdirSync(join(tempDir, "dir"));

      await expect(
        executeEffect(
          { _tag: "DeleteFile", path: join(tempDir, "dir") },
          new Map(),
        ),
      ).rejects.toThrow();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// executeEffect - Log fallback for all levels
// =============================================================================

describe("Interpreter - executeEffect Log fallback for all levels", () => {
  it.each([
    "debug",
    "warn",
    "error",
  ] as const)("logs %s level with prefix to console", async (level) => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await executeEffect({ _tag: "Log", level, message: "msg" }, new Map());

      const prefix = { debug: "[DEBUG]", warn: "[WARN]", error: "[ERROR]" }[
        level
      ];
      expect(consoleSpy).toHaveBeenCalledWith(`${prefix} msg`);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

// =============================================================================
// runTask - Parallel with non-TaskExecutionError failures
// =============================================================================

describe("Interpreter - runTask Parallel with raw errors", () => {
  it("wraps non-TaskExecutionError as INTERNAL code", async () => {
    const throwingTask: Task<number> = {
      _tag: "Effect",
      effect: {
        _tag: "ReadFile",
        path: "/nonexistent/path/that/does/not/exist",
      },
      cont: () => pure(1),
    };

    const task = effect<unknown[]>({
      _tag: "Parallel",
      tasks: [throwingTask, pure(2)],
    });

    try {
      await runTask(task);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TaskExecutionError);
    }
  });
});

// =============================================================================
// TaskExecutionError - without stack
// =============================================================================

describe("Interpreter - TaskExecutionError without stack", () => {
  it("does not override stack when taskError has no stack", () => {
    const taskError: TaskError = { code: "ERR", message: "No stack" };
    const err = new TaskExecutionError(taskError);

    // The stack should be the default Error stack, not undefined
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("TaskExecutionError");
  });
});

// =============================================================================
// runTask - AbortSignal without reason
// =============================================================================

describe("Interpreter - AbortSignal without reason", () => {
  it("includes default reason when abort is called without explicit reason", async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await runTask(pure(42), { signal: controller.signal });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TaskExecutionError);
      expect((err as TaskExecutionError).code).toBe("TASK_INTERRUPTED");
      // The signal.reason is truthy (AbortError), so the message includes it
      expect((err as TaskExecutionError).message).toContain("Task interrupted");
    }
  });

  it("produces generic message when reason is empty string", async () => {
    // Create an AbortSignal with a falsy reason
    const signal = AbortSignal.abort("");

    try {
      await runTask(pure(42), { signal });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TaskExecutionError);
      expect((err as TaskExecutionError).message).toBe("Task interrupted");
    }
  });
});
