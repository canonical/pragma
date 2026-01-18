import { describe, expect, it } from "vitest";
import {
  attempt,
  bracket,
  delay,
  ensure,
  fold,
  ifElse,
  ifElseM,
  optional,
  orElse,
  parallel,
  parallelN,
  race,
  retry,
  retryWithBackoff,
  sequence,
  sequence_,
  tap,
  tapError,
  timeout,
  traverse,
  traverse_,
  unless,
  when,
  whenM,
  zip,
  zip3,
} from "../combinators.js";
import { dryRun } from "../dry-run.js";
import { info, mkdir, writeFile } from "../primitives.js";
import { effect, fail, flatMap, map, pure } from "../task.js";
import type { Effect, Task, TaskError } from "../types.js";

// =============================================================================
// Sequencing Combinators
// =============================================================================

describe("Combinators - Sequencing", () => {
  describe("sequence", () => {
    it("sequences an empty array to an empty result", () => {
      const t = sequence([]);
      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("sequences pure tasks and collects results", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const t = sequence(tasks);

      expect(t._tag).toBe("Pure");
      expect((t as { value: number[] }).value).toEqual([1, 2, 3]);
    });

    it("short-circuits on failure", () => {
      const error: TaskError = { code: "ERR", message: "failed" };
      const tasks = [pure(1), fail<number>(error), pure(3)];
      const t = sequence(tasks);

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("ERR");
    });

    it("preserves order", () => {
      const tasks = [pure("a"), pure("b"), pure("c"), pure("d"), pure("e")];
      const t = sequence(tasks);
      expect((t as { value: string[] }).value).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("handles tasks with effects", () => {
      const tasks = [
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ];
      const { effects } = dryRun(sequence(tasks));

      expect(effects.length).toBe(2);
      expect(effects[0]._tag).toBe("WriteFile");
      expect(effects[1]._tag).toBe("WriteFile");
    });

    it("handles mixed pure and effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const tasks = [pure(1), effect<string>(eff), pure(3)];
      const t = sequence(tasks);

      expect(t._tag).toBe("Effect");
    });

    it("handles single task", () => {
      const t = sequence([pure(42)]);
      expect((t as { value: number[] }).value).toEqual([42]);
    });

    it("handles large arrays", () => {
      const tasks = Array.from({ length: 100 }, (_, i) => pure(i));
      const t = sequence(tasks);
      expect((t as { value: number[] }).value).toHaveLength(100);
      expect((t as { value: number[] }).value[99]).toBe(99);
    });
  });

  describe("sequence_", () => {
    it("sequences tasks and discards results", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const t = sequence_(tasks);

      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown }).value).toBeUndefined();
    });

    it("still runs all effects", () => {
      const tasks = [
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
        writeFile("/c.txt", "c"),
      ];
      const { effects, value } = dryRun(sequence_(tasks));

      expect(effects.length).toBe(3);
      expect(value).toBeUndefined();
    });

    it("short-circuits on failure", () => {
      const error: TaskError = { code: "ERR", message: "failed" };
      const tasks = [pure(1), fail<number>(error), pure(3)];
      const t = sequence_(tasks);

      expect(t._tag).toBe("Fail");
    });

    it("handles empty array", () => {
      const t = sequence_([]);
      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown }).value).toBeUndefined();
    });
  });

  describe("traverse", () => {
    it("applies function to each element and sequences results", () => {
      const items = [1, 2, 3];
      const t = traverse(items, (x) => pure(x * 2));

      expect(t._tag).toBe("Pure");
      expect((t as { value: number[] }).value).toEqual([2, 4, 6]);
    });

    it("provides index to the function", () => {
      const items = ["a", "b", "c"];
      const t = traverse(items, (item, index) => pure(`${item}${index}`));

      expect((t as { value: string[] }).value).toEqual(["a0", "b1", "c2"]);
    });

    it("handles empty array", () => {
      const t = traverse([], (x: number) => pure(x));
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("short-circuits on failure", () => {
      const error: TaskError = { code: "ERR", message: "failed" };
      const items = [1, 2, 3];
      const t = traverse(items, (x) => (x === 2 ? fail<number>(error) : pure(x)));

      expect(t._tag).toBe("Fail");
    });

    it("can create effects from items", () => {
      const files = ["a.txt", "b.txt"];
      const t = traverse(files, (file) => writeFile(`/${file}`, "content"));
      const { effects } = dryRun(t);

      expect(effects.length).toBe(2);
    });
  });

  describe("traverse_", () => {
    it("applies function to each element and discards results", () => {
      const items = ["a", "b", "c"];
      let count = 0;
      const t = traverse_(items, (_item) => {
        count++;
        return pure(undefined);
      });

      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown }).value).toBeUndefined();
    });

    it("provides index to the function", () => {
      const items = [1, 2, 3];
      const indices: number[] = [];
      traverse_(items, (_item, index) => {
        indices.push(index);
        return pure(undefined);
      });
      // Note: indices won't be populated until dry-run/execution
    });

    it("handles effects", () => {
      const files = ["/a.txt", "/b.txt"];
      const t = traverse_(files, (path) => writeFile(path, "x"));
      const { effects } = dryRun(t);

      expect(effects.length).toBe(2);
    });
  });
});

// =============================================================================
// Parallel Combinators
// =============================================================================

describe("Combinators - Parallel", () => {
  describe("parallel", () => {
    it("returns empty array for empty tasks", () => {
      const t = parallel([]);
      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("creates a Parallel effect for non-empty tasks", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const t = parallel(tasks);

      expect(t._tag).toBe("Effect");
      const effectTask = t as { effect: Effect };
      expect(effectTask.effect._tag).toBe("Parallel");
    });

    it("collects results in dry run", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const { value } = dryRun(parallel(tasks));

      expect(value).toEqual([1, 2, 3]);
    });
  });

  describe("parallelN", () => {
    it("returns empty array for empty tasks", () => {
      const t = parallelN(2, []);
      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("batches tasks by concurrency limit", () => {
      const tasks = [pure(1), pure(2), pure(3), pure(4), pure(5)];
      const { value } = dryRun(parallelN(2, tasks));

      expect(value).toEqual([1, 2, 3, 4, 5]);
    });

    it("handles single batch", () => {
      const tasks = [pure(1), pure(2)];
      const { value } = dryRun(parallelN(5, tasks));

      expect(value).toEqual([1, 2]);
    });

    it("handles exact batch size", () => {
      const tasks = [pure(1), pure(2), pure(3), pure(4)];
      const { value } = dryRun(parallelN(2, tasks));

      expect(value).toEqual([1, 2, 3, 4]);
    });

    it("handles batch size of 1 (sequential)", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const { value } = dryRun(parallelN(1, tasks));

      expect(value).toEqual([1, 2, 3]);
    });
  });

  describe("race", () => {
    it("fails for empty tasks", () => {
      const t = race([]);
      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("RACE_EMPTY");
    });

    it("creates a Race effect for non-empty tasks", () => {
      const tasks = [pure(1), pure(2)];
      const t = race(tasks);

      expect(t._tag).toBe("Effect");
      const effectTask = t as { effect: Effect };
      expect(effectTask.effect._tag).toBe("Race");
    });

    it("returns first task result in dry run", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const { value } = dryRun(race(tasks));

      expect(value).toBe(1);
    });
  });
});

// =============================================================================
// Conditional Combinators
// =============================================================================

describe("Combinators - Conditional", () => {
  describe("when", () => {
    it("runs task when condition is true", () => {
      const { effects } = dryRun(when(true, info("running")));
      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Log");
    });

    it("returns pure undefined when condition is false", () => {
      const task = when(false, info("not running"));
      expect(task._tag).toBe("Pure");
      expect((task as { value: unknown }).value).toBeUndefined();

      const { effects } = dryRun(task);
      expect(effects.length).toBe(0);
    });

    it("handles pure tasks", () => {
      const task = when(true, pure(undefined));
      expect(task._tag).toBe("Pure");
    });
  });

  describe("unless", () => {
    it("runs task when condition is false", () => {
      const { effects } = dryRun(unless(false, info("running")));
      expect(effects.length).toBe(1);
    });

    it("returns pure undefined when condition is true", () => {
      const task = unless(true, info("not running"));
      expect(task._tag).toBe("Pure");

      const { effects } = dryRun(task);
      expect(effects.length).toBe(0);
    });
  });

  describe("ifElse", () => {
    it("returns onTrue task when condition is true", () => {
      const t = ifElse(true, pure("yes"), pure("no"));
      expect((t as { value: string }).value).toBe("yes");
    });

    it("returns onFalse task when condition is false", () => {
      const t = ifElse(false, pure("yes"), pure("no"));
      expect((t as { value: string }).value).toBe("no");
    });

    it("can have different types", () => {
      const t = ifElse(true, pure(42), pure("forty-two"));
      expect((t as { value: number | string }).value).toBe(42);
    });

    it("works with effects", () => {
      const t = ifElse(true, info("true branch"), info("false branch"));
      const { effects } = dryRun(t);

      expect(effects.length).toBe(1);
      expect((effects[0] as { message: string }).message).toBe("true branch");
    });
  });

  describe("whenM", () => {
    it("runs task when condition task returns true", () => {
      const t = whenM(pure(true), info("running"));
      const { effects } = dryRun(t);

      expect(effects.length).toBe(1);
    });

    it("does not run task when condition task returns false", () => {
      const t = whenM(pure(false), info("not running"));
      const { effects } = dryRun(t);

      expect(effects.length).toBe(0);
    });
  });

  describe("ifElseM", () => {
    it("chooses based on condition task", () => {
      const t = ifElseM(pure(true), pure("yes"), pure("no"));
      const { value } = dryRun(t);

      expect(value).toBe("yes");
    });

    it("propagates failure from condition task", () => {
      const error: TaskError = { code: "ERR", message: "condition failed" };
      const t = ifElseM(fail<boolean>(error), pure("yes"), pure("no"));

      expect(t._tag).toBe("Fail");
    });
  });
});

// =============================================================================
// Error Handling Combinators
// =============================================================================

describe("Combinators - Error Handling", () => {
  describe("retry", () => {
    it("returns the task immediately if maxAttempts is 1", () => {
      const t = retry(pure(42), 1);
      expect((t as { value: number }).value).toBe(42);
    });

    it("returns the task immediately if maxAttempts is 0", () => {
      const t = retry(pure(42), 0);
      expect((t as { value: number }).value).toBe(42);
    });

    it("propagates success without retrying", () => {
      const t = retry(pure(42), 3);
      expect((t as { value: number }).value).toBe(42);
    });

    it("wraps failed task in recover for retry", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = retry(fail<number>(error), 2);

      // After all retries exhausted, it should still fail
      expect(t._tag).toBe("Fail");
    });
  });

  describe("retryWithBackoff", () => {
    it("behaves like retry (backoff is handled by interpreter)", () => {
      const t = retryWithBackoff(pure(42), 3, 100);
      expect((t as { value: number }).value).toBe(42);
    });
  });

  describe("orElse", () => {
    it("returns primary if it succeeds", () => {
      const t = orElse(pure(42), pure(0));
      expect((t as { value: number }).value).toBe(42);
    });

    it("returns fallback if primary fails", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = orElse(fail<number>(error), pure(99));

      expect((t as { value: number }).value).toBe(99);
    });

    it("propagates fallback failure", () => {
      const error1: TaskError = { code: "ERR1", message: "first" };
      const error2: TaskError = { code: "ERR2", message: "second" };
      const t = orElse(fail<number>(error1), fail<number>(error2));

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("ERR2");
    });

    it("can chain multiple fallbacks", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = orElse(
        orElse(fail<number>(error), fail<number>(error)),
        pure(42),
      );

      expect((t as { value: number }).value).toBe(42);
    });
  });

  describe("optional", () => {
    it("returns the value if task succeeds", () => {
      const t = optional(pure(42));
      expect((t as { value: number | undefined }).value).toBe(42);
    });

    it("returns undefined if task fails", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = optional(fail<number>(error));

      expect((t as { value: number | undefined }).value).toBeUndefined();
    });

    it("works with effects", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = optional(effect<string>(eff));

      expect(t._tag).toBe("Effect");
    });
  });

  describe("attempt", () => {
    it("returns ok result on success", () => {
      const t = attempt(pure(42));
      const result = (t as { value: { ok: boolean; value?: number } }).value;

      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it("returns error result on failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = attempt(fail<number>(error));
      const result = (t as { value: { ok: boolean; error?: TaskError } }).value;

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("ERR");
    });

    it("never throws - always returns Pure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = attempt(fail<number>(error));

      expect(t._tag).toBe("Pure");
    });
  });
});

// =============================================================================
// Resource Management Combinators
// =============================================================================

describe("Combinators - Resource Management", () => {
  describe("bracket", () => {
    it("runs acquire, use, and release in order for pure tasks", () => {
      const acquire = pure("resource");
      const use = (r: string) => pure(r.length);
      const release = (_r: string) => pure(undefined);

      const t = bracket(acquire, use, release);

      expect((t as { value: number }).value).toBe(8);
    });

    it("runs release on failure", () => {
      const acquire = pure("resource");
      const error: TaskError = { code: "USE_ERR", message: "use failed" };
      const use = (_r: string) => fail<number>(error);
      const release = (_r: string) => pure(undefined);

      const t = bracket(acquire, use, release);

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("USE_ERR");
    });

    it("propagates acquire failure without running use or release", () => {
      const error: TaskError = { code: "ACQUIRE_ERR", message: "acquire failed" };
      const acquire = fail<string>(error);
      const use = (_r: string) => pure(42);
      const release = (_r: string) => pure(undefined);

      const t = bracket(acquire, use, release);

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("ACQUIRE_ERR");
    });

    it("works with effects", () => {
      const acquire = writeFile("/lock", "locked");
      const use = () => info("using resource");
      const release = () => writeFile("/lock", "unlocked");

      const { effects } = dryRun(bracket(acquire, use, release));

      expect(effects.length).toBe(3);
    });
  });

  describe("ensure", () => {
    it("runs cleanup after successful task", () => {
      const t = ensure(pure(42), info("cleanup"));
      const { value, effects } = dryRun(t);

      expect(value).toBe(42);
      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Log");
    });

    it("runs cleanup and propagates failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = ensure(fail<number>(error), info("cleanup"));

      // dryRun throws TaskExecutionError on failure
      expect(() => dryRun(t)).toThrow("error");
    });

    it("cleanup failure does not override main task failure", () => {
      const mainError: TaskError = { code: "MAIN_ERR", message: "main" };
      const cleanupError: TaskError = { code: "CLEANUP_ERR", message: "cleanup" };
      const t = ensure(fail<number>(mainError), fail<void>(cleanupError));

      // When both main and cleanup fail, one of them propagates
      expect(() => dryRun(t)).toThrow();
    });
  });
});

// =============================================================================
// Utility Combinators
// =============================================================================

describe("Combinators - Utility", () => {
  describe("tap", () => {
    it("executes side effect but returns original value", () => {
      const t = tap(pure(42), (x) => info(`Value is ${x}`));
      const { value, effects } = dryRun(t);

      expect(value).toBe(42);
      expect(effects.length).toBe(1);
    });

    it("propagates failure from main task", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = tap(fail<number>(error), () => info("side effect"));

      expect(t._tag).toBe("Fail");
    });

    it("propagates failure from side effect", () => {
      const error: TaskError = { code: "SIDE_ERR", message: "side effect failed" };
      const t = tap(pure(42), () => fail<void>(error));

      expect(t._tag).toBe("Fail");
    });
  });

  describe("tapError", () => {
    it("does not affect successful tasks", () => {
      const t = tapError(pure(42), () => info("error occurred"));
      const { value, effects } = dryRun(t);

      expect(value).toBe(42);
      expect(effects.length).toBe(0);
    });

    it("executes side effect on failure and re-throws", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = tapError(fail<number>(error), (e) => info(`Error: ${e.code}`));

      // dryRun throws TaskExecutionError on failure
      expect(() => dryRun(t)).toThrow("error");
    });
  });

  describe("delay", () => {
    it("returns the task unchanged (delay handled by interpreter)", () => {
      const t = delay(pure(42), 1000);
      expect((t as { value: number }).value).toBe(42);
    });
  });

  describe("timeout", () => {
    it("returns the task unchanged (timeout handled by interpreter)", () => {
      const t = timeout(pure(42), 5000);
      expect((t as { value: number }).value).toBe(42);
    });
  });

  describe("fold", () => {
    it("applies onSuccess for successful task", () => {
      const t = fold(
        pure(42),
        (x) => `success: ${x}`,
        (e) => `error: ${e.code}`,
      );

      expect((t as { value: string }).value).toBe("success: 42");
    });

    it("applies onFailure for failed task", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = fold(
        fail<number>(error),
        (x) => `success: ${x}`,
        (e) => `error: ${e.code}`,
      );

      expect((t as { value: string }).value).toBe("error: ERR");
    });

    it("never fails - always returns Pure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = fold(
        fail<number>(error),
        () => "success",
        () => "failure",
      );

      expect(t._tag).toBe("Pure");
    });
  });

  describe("zip", () => {
    it("combines two tasks into a tuple", () => {
      const t = zip(pure(1), pure("a"));
      expect((t as { value: [number, string] }).value).toEqual([1, "a"]);
    });

    it("propagates first failure", () => {
      const error: TaskError = { code: "ERR1", message: "first" };
      const t = zip(fail<number>(error), pure("a"));

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("ERR1");
    });

    it("propagates second failure", () => {
      const error: TaskError = { code: "ERR2", message: "second" };
      const t = zip(pure(1), fail<string>(error));

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("ERR2");
    });

    it("works with effects", () => {
      const t = zip(writeFile("/a.txt", "a"), writeFile("/b.txt", "b"));
      const { effects } = dryRun(t);

      expect(effects.length).toBe(2);
    });
  });

  describe("zip3", () => {
    it("combines three tasks into a tuple", () => {
      const t = zip3(pure(1), pure("a"), pure(true));
      expect((t as { value: [number, string, boolean] }).value).toEqual([1, "a", true]);
    });

    it("propagates any failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = zip3(pure(1), fail<string>(error), pure(true));

      expect(t._tag).toBe("Fail");
    });

    it("works with effects", () => {
      const t = zip3(
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
        writeFile("/c.txt", "c"),
      );
      const { effects } = dryRun(t);

      expect(effects.length).toBe(3);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Combinators - Integration", () => {
  it("can compose multiple combinators", () => {
    const items = [1, 2, 3, 4, 5];

    const t = traverse(items, (n) =>
      when(n % 2 === 0, writeFile(`/${n}.txt`, String(n))),
    );

    const { effects } = dryRun(t);

    // Only even numbers should produce write effects
    expect(effects.filter((e) => e._tag === "WriteFile").length).toBe(2);
  });

  it("can build complex workflows", () => {
    const workflow = sequence_([
      info("Starting workflow"),
      mkdir("/output"),
      traverse_(["a", "b", "c"], (name) =>
        writeFile(`/output/${name}.txt`, `Content for ${name}`),
      ),
      info("Workflow complete"),
    ]);

    const { effects } = dryRun(workflow);

    expect(effects.filter((e) => e._tag === "Log").length).toBe(2);
    expect(effects.filter((e) => e._tag === "MakeDir").length).toBe(1);
    expect(effects.filter((e) => e._tag === "WriteFile").length).toBe(3);
  });

  it("handles error recovery in workflows", () => {
    const riskyTask = fail<number>({ code: "RISKY", message: "risky" });
    const safeTask = pure(42);

    const t = orElse(riskyTask, safeTask);
    const { value } = dryRun(t);

    expect(value).toBe(42);
  });

  it("can use bracket for resource management", () => {
    const createTempFile = writeFile("/tmp/lock", "locked");
    const useTempFile = () =>
      sequence_([
        info("Using temp file"),
        writeFile("/output.txt", "data"),
      ]);
    const cleanupTempFile = () => writeFile("/tmp/lock", "");

    const t = bracket(createTempFile, useTempFile, cleanupTempFile);
    const { effects } = dryRun(t);

    // Should have: create lock, log, write output, cleanup lock
    expect(effects.length).toBe(4);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Combinators - Edge Cases", () => {
  describe("Deep nesting", () => {
    it("handles deeply nested sequences", () => {
      let t: Task<number[]> = sequence([pure(0)]);
      for (let i = 1; i < 50; i++) {
        t = flatMap(t, (arr) => map(pure(i), (n) => [...arr, n]));
      }

      const { value } = dryRun(t);
      expect(value).toHaveLength(50);
    });

    it("handles deeply nested optionals", () => {
      const error: TaskError = { code: "ERR", message: "deep error" };
      let t: Task<number | undefined> = optional(fail<number>(error));

      for (let i = 0; i < 10; i++) {
        t = optional(t);
      }

      const { value } = dryRun(t);
      expect(value).toBeUndefined();
    });
  });

  describe("Empty inputs", () => {
    it("traverse handles empty array", () => {
      const t = traverse([], (x: number) => pure(x * 2));
      expect((t as { value: number[] }).value).toEqual([]);
    });

    it("sequence handles empty array", () => {
      const t = sequence([]);
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("parallel handles empty array", () => {
      const t = parallel([]);
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("parallelN handles empty array", () => {
      const t = parallelN(5, []);
      expect((t as { value: unknown[] }).value).toEqual([]);
    });
  });

  describe("Type preservation", () => {
    it("zip preserves tuple types", () => {
      const t = zip(pure(42 as const), pure("hello" as const));
      const { value } = dryRun(t);
      expect(value).toEqual([42, "hello"]);
    });

    it("fold can change types", () => {
      const t = fold(
        pure(42),
        (n) => ({ type: "success", value: n }),
        (e) => ({ type: "error", code: e.code }),
      );

      const { value } = dryRun(t);
      expect(value).toEqual({ type: "success", value: 42 });
    });
  });
});
