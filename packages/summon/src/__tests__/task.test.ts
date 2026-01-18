import { describe, expect, it } from "vitest";
import {
  ap,
  effect,
  fail,
  failWith,
  flatMap,
  hasEffects,
  isFailed,
  isPure,
  map,
  mapError,
  of,
  pure,
  recover,
  task,
  TaskBuilder,
} from "../task.js";
import type { Effect, Task, TaskError } from "../types.js";

// =============================================================================
// Core Constructors
// =============================================================================

describe("Task Monad - Core Constructors", () => {
  describe("pure", () => {
    it("creates a Pure task with the given value", () => {
      const t = pure(42);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(42);
    });

    it("works with string values", () => {
      const t = pure("hello");
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: string }).value).toBe("hello");
    });

    it("works with object values", () => {
      const obj = { a: 1, b: "test" };
      const t = pure(obj);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: typeof obj }).value).toEqual(obj);
    });

    it("works with array values", () => {
      const arr = [1, 2, 3];
      const t = pure(arr);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number[] }).value).toEqual(arr);
    });

    it("works with null value", () => {
      const t = pure(null);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: null }).value).toBeNull();
    });

    it("works with undefined value", () => {
      const t = pure(undefined);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: undefined }).value).toBeUndefined();
    });

    it("works with boolean values", () => {
      expect((pure(true) as { value: boolean }).value).toBe(true);
      expect((pure(false) as { value: boolean }).value).toBe(false);
    });

    it("works with nested objects", () => {
      const nested = { outer: { inner: { value: 42 } } };
      const t = pure(nested);
      expect((t as { value: typeof nested }).value).toEqual(nested);
    });

    it("preserves referential equality", () => {
      const obj = { a: 1 };
      const t = pure(obj);
      expect((t as { value: typeof obj }).value).toBe(obj);
    });
  });

  describe("effect", () => {
    it("creates an Effect task with the given effect", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = effect<string>(eff);

      expect(t._tag).toBe("Effect");
      expect((t as { effect: Effect }).effect).toEqual(eff);
    });

    it("has a continuation that wraps result in Pure", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = effect<string>(eff);

      const effectTask = t as {
        _tag: "Effect";
        effect: Effect;
        cont: (result: unknown) => Task<string>;
      };

      const continued = effectTask.cont("file content");
      expect(continued._tag).toBe("Pure");
      expect((continued as { value: string }).value).toBe("file content");
    });

    it("creates WriteFile effect correctly", () => {
      const eff: Effect = {
        _tag: "WriteFile",
        path: "/output.txt",
        content: "hello",
      };
      const t = effect<void>(eff);

      expect((t as { effect: Effect }).effect._tag).toBe("WriteFile");
    });

    it("creates Exec effect correctly", () => {
      const eff: Effect = {
        _tag: "Exec",
        command: "npm",
        args: ["install"],
        cwd: "/project",
      };
      const t = effect(eff);

      const effectTask = t as { effect: Effect };
      expect(effectTask.effect._tag).toBe("Exec");
      expect((effectTask.effect as { command: string }).command).toBe("npm");
    });
  });

  describe("fail", () => {
    it("creates a Fail task with the given error", () => {
      const error: TaskError = { code: "TEST_ERROR", message: "Test error" };
      const t = fail(error);

      expect(t._tag).toBe("Fail");
      expect((t as { _tag: "Fail"; error: TaskError }).error).toEqual(error);
    });

    it("preserves error code", () => {
      const error: TaskError = { code: "ERR_NOT_FOUND", message: "Not found" };
      const t = fail(error);
      expect((t as { error: TaskError }).error.code).toBe("ERR_NOT_FOUND");
    });

    it("preserves error message", () => {
      const error: TaskError = { code: "ERR", message: "Something went wrong" };
      const t = fail(error);
      expect((t as { error: TaskError }).error.message).toBe(
        "Something went wrong",
      );
    });

    it("preserves error cause", () => {
      const cause = new Error("Original error");
      const error: TaskError = { code: "WRAPPED", message: "Wrapped", cause };
      const t = fail(error);
      expect((t as { error: TaskError }).error.cause).toBe(cause);
    });

    it("preserves error context", () => {
      const context = { userId: 123, action: "delete" };
      const error: TaskError = { code: "ERR", message: "Error", context };
      const t = fail(error);
      expect((t as { error: TaskError }).error.context).toEqual(context);
    });

    it("preserves error stack", () => {
      const error: TaskError = {
        code: "ERR",
        message: "Error",
        stack: "Error: test\n  at test.ts:1:1",
      };
      const t = fail(error);
      expect((t as { error: TaskError }).error.stack).toContain("Error: test");
    });
  });

  describe("failWith", () => {
    it("creates a Fail task from code and message", () => {
      const t = failWith("ERR_CODE", "Error message");

      expect(t._tag).toBe("Fail");
      const failTask = t as { _tag: "Fail"; error: TaskError };
      expect(failTask.error.code).toBe("ERR_CODE");
      expect(failTask.error.message).toBe("Error message");
    });

    it("works with empty message", () => {
      const t = failWith("ERR", "");
      expect((t as { error: TaskError }).error.message).toBe("");
    });

    it("works with special characters in message", () => {
      const t = failWith("ERR", 'Special chars: @#$%^&*()[]{}|\\;"<>');
      expect((t as { error: TaskError }).error.message).toContain("Special");
    });

    it("works with unicode in message", () => {
      const t = failWith("ERR", "Unicode: \u{1F600} \u{1F4A5}");
      expect((t as { error: TaskError }).error.message).toContain("Unicode");
    });
  });
});

// =============================================================================
// Monad Operations
// =============================================================================

describe("Task Monad - Monad Operations", () => {
  describe("flatMap", () => {
    it("chains Pure tasks", () => {
      const t = flatMap(pure(5), (x) => pure(x + 3));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(8);
    });

    it("propagates Fail tasks without calling continuation", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      let called = false;
      const t = flatMap(fail<number>(error), (_x) => {
        called = true;
        return pure(0);
      });

      expect(t._tag).toBe("Fail");
      expect(called).toBe(false);
    });

    it("returns Fail if continuation fails", () => {
      const error: TaskError = { code: "CONT_ERR", message: "continuation error" };
      const t = flatMap(pure(5), () => fail<number>(error));
      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("CONT_ERR");
    });

    it("chains through Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = flatMap(effect<string>(eff), (content) =>
        pure(content.length),
      );

      expect(t._tag).toBe("Effect");
      const effectTask = t as {
        _tag: "Effect";
        cont: (result: unknown) => Task<number>;
      };
      const continued = effectTask.cont("hello");
      expect((continued as { value: number }).value).toBe(5);
    });

    it("chains multiple operations", () => {
      const t = flatMap(
        flatMap(pure(2), (x) => pure(x * 3)),
        (x) => pure(x + 1),
      );
      expect((t as { value: number }).value).toBe(7);
    });

    it("handles nested flatMaps", () => {
      const t = flatMap(pure(1), (a) =>
        flatMap(pure(2), (b) => flatMap(pure(3), (c) => pure(a + b + c))),
      );
      expect((t as { value: number }).value).toBe(6);
    });
  });

  describe("map", () => {
    it("transforms the value of a Pure task", () => {
      const t = map(pure(10), (x) => x * 2);
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(20);
    });

    it("propagates Fail tasks without calling function", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      let called = false;
      const t = map(fail<number>(error), (_x) => {
        called = true;
        return 0;
      });

      expect(t._tag).toBe("Fail");
      expect(called).toBe(false);
    });

    it("maps through Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = map(effect<string>(eff), (s) => s.toUpperCase());

      expect(t._tag).toBe("Effect");
      const effectTask = t as {
        cont: (result: unknown) => Task<string>;
      };
      const continued = effectTask.cont("hello");
      expect((continued as { value: string }).value).toBe("HELLO");
    });

    it("can transform types", () => {
      const t = map(pure(42), (n) => String(n));
      expect((t as { value: string }).value).toBe("42");
    });

    it("can transform to complex types", () => {
      const t = map(pure("hello"), (s) => ({ length: s.length, upper: s.toUpperCase() }));
      expect((t as { value: { length: number; upper: string } }).value).toEqual({
        length: 5,
        upper: "HELLO",
      });
    });

    it("handles identity function", () => {
      const t = map(pure(42), (x) => x);
      expect((t as { value: number }).value).toBe(42);
    });

    it("handles constant function", () => {
      const t = map(pure(42), () => "constant");
      expect((t as { value: string }).value).toBe("constant");
    });
  });

  describe("ap", () => {
    it("applies a function in a task to a value in a task", () => {
      const fnTask = pure((x: number) => x * 2);
      const valTask = pure(21);
      const t = ap(fnTask, valTask);

      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });

    it("propagates failure from function task", () => {
      const error: TaskError = { code: "FN_ERR", message: "function error" };
      const fnTask = fail<(x: number) => number>(error);
      const valTask = pure(21);
      const t = ap(fnTask, valTask);

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("FN_ERR");
    });

    it("propagates failure from value task", () => {
      const error: TaskError = { code: "VAL_ERR", message: "value error" };
      const fnTask = pure((x: number) => x * 2);
      const valTask = fail<number>(error);
      const t = ap(fnTask, valTask);

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("VAL_ERR");
    });

    it("works with multi-argument functions via currying", () => {
      const add = (a: number) => (b: number) => a + b;
      const t1 = ap(pure(add), pure(10));
      const t2 = ap(t1, pure(5));

      expect((t2 as { value: number }).value).toBe(15);
    });
  });

  describe("recover", () => {
    it("does not affect Pure tasks", () => {
      const t = recover(pure(42), () => pure(0));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });

    it("recovers from Fail tasks", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = recover(fail<number>(error), () => pure(99));

      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(99);
    });

    it("provides the error to the handler", () => {
      const error: TaskError = { code: "ERR_42", message: "error 42" };
      const t = recover(fail<string>(error), (e) => pure(`recovered: ${e.code}`));

      expect((t as { value: string }).value).toBe("recovered: ERR_42");
    });

    it("can return another Fail from handler", () => {
      const error1: TaskError = { code: "ERR1", message: "first" };
      const error2: TaskError = { code: "ERR2", message: "second" };
      const t = recover(fail<number>(error1), () => fail<number>(error2));

      expect(t._tag).toBe("Fail");
      expect((t as { error: TaskError }).error.code).toBe("ERR2");
    });

    it("propagates through Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = recover(effect<string>(eff), () => pure("recovered"));

      expect(t._tag).toBe("Effect");
    });

    it("handles nested recover calls", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = recover(
        recover(fail<number>(error), () => fail<number>({ code: "ERR2", message: "second" })),
        () => pure(42),
      );

      expect((t as { value: number }).value).toBe(42);
    });
  });

  describe("mapError", () => {
    it("does not affect Pure tasks", () => {
      const t = mapError(pure(42), (e) => ({ ...e, code: "MODIFIED" }));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });

    it("transforms the error of Fail tasks", () => {
      const error: TaskError = { code: "ORIGINAL", message: "original" };
      const t = mapError(fail<number>(error), (e) => ({
        ...e,
        code: "MODIFIED",
        message: `wrapped: ${e.message}`,
      }));

      expect(t._tag).toBe("Fail");
      const failTask = t as { error: TaskError };
      expect(failTask.error.code).toBe("MODIFIED");
      expect(failTask.error.message).toBe("wrapped: original");
    });

    it("propagates through Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = mapError(effect<string>(eff), (e) => ({ ...e, code: "MODIFIED" }));

      expect(t._tag).toBe("Effect");
    });

    it("can add context to errors", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = mapError(fail<number>(error), (e) => ({
        ...e,
        context: { operation: "test", timestamp: 12345 },
      }));

      const failTask = t as { error: TaskError };
      expect(failTask.error.context).toEqual({
        operation: "test",
        timestamp: 12345,
      });
    });
  });
});

// =============================================================================
// TaskBuilder (Fluent API)
// =============================================================================

describe("Task Monad - TaskBuilder", () => {
  describe("map method", () => {
    it("transforms value fluently", () => {
      const result = of(10).map((x) => x * 2).unwrap();
      expect((result as { value: number }).value).toBe(20);
    });

    it("chains multiple maps", () => {
      const result = of(5)
        .map((x) => x + 1)
        .map((x) => x * 2)
        .map((x) => String(x))
        .unwrap();

      expect((result as { value: string }).value).toBe("12");
    });
  });

  describe("flatMap method", () => {
    it("chains with task-returning function", () => {
      const result = of(10)
        .flatMap((x) => pure(x * 2))
        .unwrap();

      expect((result as { value: number }).value).toBe(20);
    });

    it("allows mixing map and flatMap", () => {
      const result = of(5)
        .map((x) => x + 1)
        .flatMap((x) => pure(x * 2))
        .map((x) => x + 3)
        .unwrap();

      expect((result as { value: number }).value).toBe(15);
    });
  });

  describe("chain method", () => {
    it("chains with TaskBuilder-returning function", () => {
      const result = of(5)
        .chain((x) => of(x * 3))
        .chain((x) => of(x + 1))
        .unwrap();

      expect((result as { value: number }).value).toBe(16);
    });
  });

  describe("recover method", () => {
    it("recovers from failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const result = task(fail<number>(error))
        .recover(() => pure(42))
        .unwrap();

      expect((result as { value: number }).value).toBe(42);
    });

    it("does not affect successful tasks", () => {
      const result = of(100)
        .recover(() => pure(0))
        .unwrap();

      expect((result as { value: number }).value).toBe(100);
    });
  });

  describe("mapError method", () => {
    it("transforms errors", () => {
      const error: TaskError = { code: "ORIG", message: "original" };
      const result = task(fail<number>(error))
        .mapError((e) => ({ ...e, code: "MODIFIED" }))
        .unwrap();

      expect(result._tag).toBe("Fail");
      expect((result as { error: TaskError }).error.code).toBe("MODIFIED");
    });
  });

  describe("tap method", () => {
    it("executes side effect without changing value", () => {
      let sideEffect = 0;
      const result = of(42)
        .tap((x) => {
          sideEffect = x;
          return pure(undefined);
        })
        .unwrap();

      expect((result as { value: number }).value).toBe(42);
      // Note: side effect happens during dry-run/execution, not task construction
    });
  });

  describe("then method", () => {
    it("sequences tasks discarding first result", () => {
      const result = of(1)
        .then(pure(2))
        .then(pure(3))
        .unwrap();

      expect((result as { value: number }).value).toBe(3);
    });

    it("propagates failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const result = of(1)
        .then(fail<number>(error))
        .then(pure(3))
        .unwrap();

      expect(result._tag).toBe("Fail");
    });
  });

  describe("unwrap method", () => {
    it("extracts the underlying task", () => {
      const builder = of(42);
      const task = builder.unwrap();

      expect(task._tag).toBe("Pure");
      expect((task as { value: number }).value).toBe(42);
    });
  });

  describe("task function", () => {
    it("wraps existing task in builder", () => {
      const original = pure(42);
      const builder = task(original);

      expect(builder.unwrap()).toBe(original);
    });
  });

  describe("of function", () => {
    it("creates TaskBuilder from pure value", () => {
      const builder = of(42);
      const result = builder.unwrap();

      expect(result._tag).toBe("Pure");
      expect((result as { value: number }).value).toBe(42);
    });
  });
});

// =============================================================================
// Type Guards
// =============================================================================

describe("Task Monad - Type Guards", () => {
  describe("isPure", () => {
    it("returns true for Pure tasks", () => {
      expect(isPure(pure(42))).toBe(true);
    });

    it("returns false for Fail tasks", () => {
      expect(isPure(fail({ code: "ERR", message: "error" }))).toBe(false);
    });

    it("returns false for Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      expect(isPure(effect(eff))).toBe(false);
    });

    it("narrows type correctly", () => {
      const t = pure(42);
      if (isPure(t)) {
        // TypeScript should allow access to value
        expect(t.value).toBe(42);
      }
    });
  });

  describe("isFailed", () => {
    it("returns true for Fail tasks", () => {
      expect(isFailed(fail({ code: "ERR", message: "error" }))).toBe(true);
    });

    it("returns false for Pure tasks", () => {
      expect(isFailed(pure(42))).toBe(false);
    });

    it("returns false for Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      expect(isFailed(effect(eff))).toBe(false);
    });

    it("narrows type correctly", () => {
      const t = fail({ code: "ERR", message: "error" });
      if (isFailed(t)) {
        // TypeScript should allow access to error
        expect(t.error.code).toBe("ERR");
      }
    });
  });

  describe("hasEffects", () => {
    it("returns true for Effect tasks", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      expect(hasEffects(effect(eff))).toBe(true);
    });

    it("returns false for Pure tasks", () => {
      expect(hasEffects(pure(42))).toBe(false);
    });

    it("returns false for Fail tasks", () => {
      expect(hasEffects(fail({ code: "ERR", message: "error" }))).toBe(false);
    });

    it("narrows type correctly", () => {
      const eff: Effect = { _tag: "ReadFile", path: "/test.txt" };
      const t = effect<string>(eff);
      if (hasEffects(t)) {
        // TypeScript should allow access to effect and cont
        expect(t.effect._tag).toBe("ReadFile");
        expect(typeof t.cont).toBe("function");
      }
    });
  });
});

// =============================================================================
// Monad Laws
// =============================================================================

describe("Task Monad - Monad Laws", () => {
  // Left identity: pure(a) >>= f ≡ f(a)
  describe("Left Identity", () => {
    it("pure(a) >>= f ≡ f(a) for numbers", () => {
      const f = (x: number) => pure(x * 2);
      const a = 21;

      const left = flatMap(pure(a), f);
      const right = f(a);

      expect((left as { value: number }).value).toBe(
        (right as { value: number }).value,
      );
    });

    it("pure(a) >>= f ≡ f(a) for strings", () => {
      const f = (x: string) => pure(x.toUpperCase());
      const a = "hello";

      const left = flatMap(pure(a), f);
      const right = f(a);

      expect((left as { value: string }).value).toBe(
        (right as { value: string }).value,
      );
    });

    it("pure(a) >>= f ≡ f(a) when f returns fail", () => {
      const f = (_x: number) => fail<number>({ code: "ERR", message: "error" });
      const a = 42;

      const left = flatMap(pure(a), f);
      const right = f(a);

      expect(left._tag).toBe(right._tag);
      expect((left as { error: TaskError }).error.code).toBe(
        (right as { error: TaskError }).error.code,
      );
    });
  });

  // Right identity: m >>= pure ≡ m
  describe("Right Identity", () => {
    it("m >>= pure ≡ m for Pure tasks", () => {
      const m = pure(42);
      const result = flatMap(m, pure);

      expect((result as { value: number }).value).toBe(
        (m as { value: number }).value,
      );
    });

    it("m >>= pure ≡ m for Fail tasks", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const m = fail<number>(error);
      const result = flatMap(m, pure);

      expect(result._tag).toBe("Fail");
      expect((result as { error: TaskError }).error.code).toBe(error.code);
    });
  });

  // Associativity: (m >>= f) >>= g ≡ m >>= (\x -> f(x) >>= g)
  describe("Associativity", () => {
    it("(m >>= f) >>= g ≡ m >>= (x => f(x) >>= g) for Pure tasks", () => {
      const m = pure(10);
      const f = (x: number) => pure(x + 5);
      const g = (x: number) => pure(x * 2);

      const left = flatMap(flatMap(m, f), g);
      const right = flatMap(m, (x) => flatMap(f(x), g));

      expect((left as { value: number }).value).toBe(
        (right as { value: number }).value,
      );
    });

    it("associativity holds with failure in first function", () => {
      const m = pure(10);
      const f = (_x: number) => fail<number>({ code: "ERR", message: "error" });
      const g = (x: number) => pure(x * 2);

      const left = flatMap(flatMap(m, f), g);
      const right = flatMap(m, (x) => flatMap(f(x), g));

      expect(left._tag).toBe(right._tag);
    });

    it("associativity holds with failure in second function", () => {
      const m = pure(10);
      const f = (x: number) => pure(x + 5);
      const g = (_x: number) => fail<number>({ code: "ERR", message: "error" });

      const left = flatMap(flatMap(m, f), g);
      const right = flatMap(m, (x) => flatMap(f(x), g));

      expect(left._tag).toBe(right._tag);
    });
  });
});

// =============================================================================
// Functor Laws
// =============================================================================

describe("Task Monad - Functor Laws", () => {
  // Identity: map(id) ≡ id
  describe("Identity", () => {
    it("map(id) ≡ id for Pure tasks", () => {
      const m = pure(42);
      const result = map(m, (x) => x);

      expect((result as { value: number }).value).toBe(
        (m as { value: number }).value,
      );
    });

    it("map(id) ≡ id for Fail tasks", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const m = fail<number>(error);
      const result = map(m, (x) => x);

      expect(result._tag).toBe("Fail");
    });
  });

  // Composition: map(f . g) ≡ map(f) . map(g)
  describe("Composition", () => {
    it("map(f . g) ≡ map(f) . map(g)", () => {
      const m = pure(10);
      const f = (x: number) => x + 5;
      const g = (x: number) => x * 2;

      const left = map(m, (x) => f(g(x)));
      const right = map(map(m, g), f);

      expect((left as { value: number }).value).toBe(
        (right as { value: number }).value,
      );
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Task Monad - Edge Cases", () => {
  describe("Empty and null handling", () => {
    it("handles empty string", () => {
      const t = pure("");
      expect((t as { value: string }).value).toBe("");
    });

    it("handles empty array", () => {
      const t = pure([]);
      expect((t as { value: unknown[] }).value).toEqual([]);
    });

    it("handles empty object", () => {
      const t = pure({});
      expect((t as { value: object }).value).toEqual({});
    });

    it("handles zero", () => {
      const t = pure(0);
      expect((t as { value: number }).value).toBe(0);
    });

    it("handles negative numbers", () => {
      const t = pure(-42);
      expect((t as { value: number }).value).toBe(-42);
    });

    it("handles Infinity", () => {
      const t = pure(Infinity);
      expect((t as { value: number }).value).toBe(Infinity);
    });

    it("handles NaN", () => {
      const t = pure(NaN);
      expect((t as { value: number }).value).toBeNaN();
    });
  });

  describe("Deep nesting", () => {
    it("handles deeply nested flatMap", () => {
      let t: Task<number> = pure(0);
      for (let i = 0; i < 100; i++) {
        t = flatMap(t, (x) => pure(x + 1));
      }
      expect((t as { value: number }).value).toBe(100);
    });

    it("handles deeply nested map", () => {
      let t: Task<number> = pure(0);
      for (let i = 0; i < 100; i++) {
        t = map(t, (x) => x + 1);
      }
      expect((t as { value: number }).value).toBe(100);
    });

    it("handles deeply nested TaskBuilder chains", () => {
      let builder = of(0);
      for (let i = 0; i < 100; i++) {
        builder = builder.map((x) => x + 1);
      }
      expect((builder.unwrap() as { value: number }).value).toBe(100);
    });
  });

  describe("Type coercion", () => {
    it("preserves type through transformations", () => {
      const t = map(pure({ x: 1 }), (obj) => obj.x);
      expect((t as { value: number }).value).toBe(1);
    });

    it("handles union types", () => {
      const t = pure<string | number>(42);
      expect((t as { value: string | number }).value).toBe(42);
    });

    it("handles generic types", () => {
      const createTask = <T>(value: T) => pure(value);
      const t = createTask({ nested: { value: 42 } });
      expect((t as { value: { nested: { value: number } } }).value.nested.value).toBe(42);
    });
  });
});
