import { describe, expect, it, vi } from "vitest";
import { sequence_ } from "../combinators.js";
import {
  executeEffect,
  run,
  runTask,
  TaskExecutionError,
} from "../interpreter.js";
import { info, succeed, warn } from "../primitives.js";
import { effect, fail, flatMap, map, pure } from "../task.js";
import type { Effect, TaskError } from "../types.js";

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
});
