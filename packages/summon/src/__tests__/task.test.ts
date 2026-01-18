import { describe, expect, it } from "bun:test";
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
} from "../task.js";
import type { TaskError } from "../types.js";

describe("Task Monad", () => {
  describe("pure", () => {
    it("creates a Pure task with the given value", () => {
      const t = pure(42);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(42);
    });

    it("works with different types", () => {
      expect(pure("hello")._tag).toBe("Pure");
      expect(pure({ a: 1 })._tag).toBe("Pure");
      expect(pure([1, 2, 3])._tag).toBe("Pure");
      expect(pure(null)._tag).toBe("Pure");
    });
  });

  describe("fail", () => {
    it("creates a Fail task with the given error", () => {
      const error: TaskError = { code: "TEST", message: "test error" };
      const t = fail(error);
      expect(t._tag).toBe("Fail");
      expect((t as { _tag: "Fail"; error: TaskError }).error).toEqual(error);
    });
  });

  describe("failWith", () => {
    it("creates a Fail task with code and message", () => {
      const t = failWith("ERR_CODE", "Something went wrong");
      expect(t._tag).toBe("Fail");
      const failTask = t as { _tag: "Fail"; error: TaskError };
      expect(failTask.error.code).toBe("ERR_CODE");
      expect(failTask.error.message).toBe("Something went wrong");
    });
  });

  describe("map", () => {
    it("transforms the value of a Pure task", () => {
      const t = map(pure(10), (x) => x * 2);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(20);
    });

    it("propagates Fail tasks unchanged", () => {
      const error: TaskError = { code: "TEST", message: "error" };
      const t = map(fail<number>(error), (x) => x * 2);
      expect(t._tag).toBe("Fail");
    });
  });

  describe("flatMap", () => {
    it("chains Pure tasks", () => {
      const t = flatMap(pure(5), (x) => pure(x + 3));
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(8);
    });

    it("propagates Fail tasks", () => {
      const error: TaskError = { code: "TEST", message: "error" };
      const t = flatMap(fail<number>(error), (x) => pure(x + 3));
      expect(t._tag).toBe("Fail");
    });

    it("returns Fail if the continuation fails", () => {
      const error: TaskError = { code: "TEST", message: "error" };
      const t = flatMap(pure(5), () => fail<number>(error));
      expect(t._tag).toBe("Fail");
    });
  });

  describe("ap", () => {
    it("applies a function in a task to a value in a task", () => {
      const fnTask = pure((x: number) => x * 2);
      const valTask = pure(21);
      const t = ap(fnTask, valTask);
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(42);
    });
  });

  describe("recover", () => {
    it("does not affect Pure tasks", () => {
      const t = recover(pure(42), () => pure(0));
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(42);
    });

    it("recovers from Fail tasks", () => {
      const error: TaskError = { code: "TEST", message: "error" };
      const t = recover(fail<number>(error), () => pure(99));
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: number }).value).toBe(99);
    });

    it("provides the error to the handler", () => {
      const error: TaskError = { code: "ERR_42", message: "error 42" };
      const t = recover(fail<string>(error), (e) => pure(e.code));
      expect(t._tag).toBe("Pure");
      expect((t as { _tag: "Pure"; value: string }).value).toBe("ERR_42");
    });
  });

  describe("mapError", () => {
    it("does not affect Pure tasks", () => {
      const t = mapError(pure(42), (e) => ({ ...e, code: "MODIFIED" }));
      expect(t._tag).toBe("Pure");
    });

    it("transforms the error of Fail tasks", () => {
      const error: TaskError = { code: "ORIGINAL", message: "error" };
      const t = mapError(fail<number>(error), (e) => ({
        ...e,
        code: "MODIFIED",
      }));
      expect(t._tag).toBe("Fail");
      expect((t as { _tag: "Fail"; error: TaskError }).error.code).toBe(
        "MODIFIED",
      );
    });
  });

  describe("TaskBuilder", () => {
    it("supports fluent chaining", () => {
      const result = of(10)
        .map((x) => x * 2)
        .flatMap((x) => pure(x + 5))
        .unwrap();

      expect(result._tag).toBe("Pure");
      expect((result as { _tag: "Pure"; value: number }).value).toBe(25);
    });

    it("supports chain method", () => {
      const result = of(5)
        .chain((x) => of(x * 3))
        .chain((x) => of(x + 1))
        .unwrap();

      expect(result._tag).toBe("Pure");
      expect((result as { _tag: "Pure"; value: number }).value).toBe(16);
    });

    it("supports recover method", () => {
      const error: TaskError = { code: "TEST", message: "error" };
      const result = task(fail<number>(error))
        .recover(() => pure(42))
        .unwrap();

      expect(result._tag).toBe("Pure");
      expect((result as { _tag: "Pure"; value: number }).value).toBe(42);
    });
  });

  describe("type guards", () => {
    it("isPure correctly identifies Pure tasks", () => {
      expect(isPure(pure(42))).toBe(true);
      expect(isPure(fail({ code: "X", message: "x" }))).toBe(false);
    });

    it("isFailed correctly identifies Fail tasks", () => {
      expect(isFailed(fail({ code: "X", message: "x" }))).toBe(true);
      expect(isFailed(pure(42))).toBe(false);
    });

    it("hasEffects correctly identifies Effect tasks", () => {
      const effectTask = effect<string>({
        _tag: "ReadFile",
        path: "/tmp/test",
      });
      expect(hasEffects(effectTask)).toBe(true);
      expect(hasEffects(pure(42))).toBe(false);
    });
  });
});

describe("Monad Laws", () => {
  // Left identity: pure(a) >>= f ≡ f(a)
  it("satisfies left identity", () => {
    const f = (x: number) => pure(x * 2);
    const a = 21;

    const left = flatMap(pure(a), f);
    const right = f(a);

    expect((left as { value: number }).value).toBe(
      (right as { value: number }).value,
    );
  });

  // Right identity: m >>= pure ≡ m
  it("satisfies right identity", () => {
    const m = pure(42);

    const result = flatMap(m, pure);

    expect((result as { value: number }).value).toBe(
      (m as { value: number }).value,
    );
  });

  // Associativity: (m >>= f) >>= g ≡ m >>= (\x -> f(x) >>= g)
  it("satisfies associativity", () => {
    const m = pure(10);
    const f = (x: number) => pure(x + 5);
    const g = (x: number) => pure(x * 2);

    const left = flatMap(flatMap(m, f), g);
    const right = flatMap(m, (x) => flatMap(f(x), g));

    expect((left as { value: number }).value).toBe(
      (right as { value: number }).value,
    );
  });
});
