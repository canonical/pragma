import { describe, expect, it } from "bun:test";
import {
  attempt,
  bracket,
  ensure,
  fold,
  ifElse,
  optional,
  orElse,
  retry,
  sequence,
  sequence_,
  tap,
  traverse,
  unless,
  when,
  zip,
  zip3,
} from "../combinators.js";
import { fail, flatMap, pure } from "../task.js";
import type { TaskError } from "../types.js";

describe("Sequencing Combinators", () => {
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
    });
  });

  describe("sequence_", () => {
    it("sequences tasks and discards results", () => {
      const tasks = [pure(1), pure(2), pure(3)];
      const t = sequence_(tasks);
      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown }).value).toBe(undefined);
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
      expect(t._tag).toBe("Pure");
      expect((t as { value: string[] }).value).toEqual(["a0", "b1", "c2"]);
    });
  });
});

describe("Conditional Combinators", () => {
  describe("when", () => {
    it("runs task when condition is true", () => {
      let _ran = false;
      const task = flatMap(pure(undefined), () => {
        _ran = true;
        return pure(undefined);
      });

      // For pure tasks, we can check structure
      const t = when(true, task);
      expect(t._tag).toBe("Pure");
    });

    it("returns pure undefined when condition is false", () => {
      const task = pure(undefined);
      const t = when(false, task);
      expect(t._tag).toBe("Pure");
      expect((t as { value: unknown }).value).toBe(undefined);
    });
  });

  describe("unless", () => {
    it("runs task when condition is false", () => {
      const task = pure(undefined);
      const t = unless(false, task);
      expect(t._tag).toBe("Pure");
    });

    it("returns pure undefined when condition is true", () => {
      const task = pure(undefined);
      const t = unless(true, task);
      expect(t._tag).toBe("Pure");
    });
  });

  describe("ifElse", () => {
    it("returns onTrue task when condition is true", () => {
      const t = ifElse(true, pure("yes"), pure("no"));
      expect(t._tag).toBe("Pure");
      expect((t as { value: string }).value).toBe("yes");
    });

    it("returns onFalse task when condition is false", () => {
      const t = ifElse(false, pure("yes"), pure("no"));
      expect(t._tag).toBe("Pure");
      expect((t as { value: string }).value).toBe("no");
    });
  });
});

describe("Error Handling Combinators", () => {
  describe("retry", () => {
    it("returns the task immediately if maxAttempts is 1", () => {
      const t = retry(pure(42), 1);
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });

    it("propagates success without retrying", () => {
      const t = retry(pure(42), 3);
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });
  });

  describe("orElse", () => {
    it("returns primary if it succeeds", () => {
      const t = orElse(pure(42), pure(0));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });

    it("returns fallback if primary fails", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = orElse(fail<number>(error), pure(99));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(99);
    });
  });

  describe("optional", () => {
    it("returns the value wrapped if task succeeds", () => {
      const t = optional(pure(42));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number | undefined }).value).toBe(42);
    });

    it("returns undefined if task fails", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = optional(fail<number>(error));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number | undefined }).value).toBe(undefined);
    });
  });

  describe("attempt", () => {
    it("returns ok result on success", () => {
      const t = attempt(pure(42));
      expect(t._tag).toBe("Pure");
      const result = (t as { value: { ok: boolean; value?: number } }).value;
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it("returns error result on failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = attempt(fail<number>(error));
      expect(t._tag).toBe("Pure");
      const result = (t as { value: { ok: boolean; error?: TaskError } }).value;
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("ERR");
    });
  });
});

describe("Resource Management Combinators", () => {
  describe("bracket", () => {
    it("runs acquire, use, and release in order for pure tasks", () => {
      const acquire = pure("resource");
      const use = (r: string) => pure(r.length);
      const release = (_r: string) => pure(undefined);

      const t = bracket(acquire, use, release);
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(8);
    });
  });

  describe("ensure", () => {
    it("runs cleanup after successful task", () => {
      const t = ensure(pure(42), pure(undefined));
      expect(t._tag).toBe("Pure");
      expect((t as { value: number }).value).toBe(42);
    });

    it("runs cleanup and propagates failure", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = ensure(fail<number>(error), pure(undefined));
      expect(t._tag).toBe("Fail");
    });
  });
});

describe("Utility Combinators", () => {
  describe("tap", () => {
    it("executes side effect but returns original value", () => {
      const t = tap(pure(42), (x) => pure(x * 2));
      expect(t._tag).toBe("Pure");
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
      expect(t._tag).toBe("Pure");
      expect((t as { value: string }).value).toBe("success: 42");
    });

    it("applies onFailure for failed task", () => {
      const error: TaskError = { code: "ERR", message: "error" };
      const t = fold(
        fail<number>(error),
        (x) => `success: ${x}`,
        (e) => `error: ${e.code}`,
      );
      expect(t._tag).toBe("Pure");
      expect((t as { value: string }).value).toBe("error: ERR");
    });
  });

  describe("zip", () => {
    it("combines two tasks into a tuple", () => {
      const t = zip(pure(1), pure("a"));
      expect(t._tag).toBe("Pure");
      expect((t as { value: [number, string] }).value).toEqual([1, "a"]);
    });
  });

  describe("zip3", () => {
    it("combines three tasks into a tuple", () => {
      const t = zip3(pure(1), pure("a"), pure(true));
      expect(t._tag).toBe("Pure");
      expect((t as { value: [number, string, boolean] }).value).toEqual([
        1,
        "a",
        true,
      ]);
    });
  });
});
