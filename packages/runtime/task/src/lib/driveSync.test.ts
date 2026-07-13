import { describe, expect, it } from "vitest";
import driveSync from "./driveSync.js";
import { TaskExecutionError } from "./errors.js";
import { effect, fail, flatMap, pure, recover } from "./task.js";
import type { Effect, Task } from "./types.js";

const failIfCalled = (): unknown => {
  throw new Error("resolveEffect should not be called for effect-free tasks");
};

describe("driveSync", () => {
  it("returns the value of a pure task", () => {
    const task: Task<unknown> = pure(42);

    expect(driveSync(task, failIfCalled)).toBe(42);
  });

  it("drives a flatMap chain to its final value", () => {
    const task: Task<unknown> = flatMap(pure(1), (x) =>
      flatMap(pure(2), (y) => pure(x + y)),
    );

    expect(driveSync(task, failIfCalled)).toBe(3);
  });

  it("resolves each leaf effect through resolveEffect and threads the result", () => {
    const seen: Effect[] = [];
    const task: Task<unknown> = effect<string>({
      _tag: "ReadFile",
      path: "/x",
    });

    const value = driveSync(task, (leaf) => {
      seen.push(leaf);
      return "content";
    });

    expect(value).toBe("content");
    expect(seen).toHaveLength(1);
    expect(seen.at(0)?._tag).toBe("ReadFile");
  });

  it("routes a Fail to the nearest recover handler", () => {
    const task: Task<unknown> = recover(
      fail<number>({ code: "BOOM", message: "boom" }),
      (err) => pure(`recovered:${err.code}`),
    );

    expect(driveSync(task, failIfCalled)).toBe("recovered:BOOM");
  });

  it("throws TaskExecutionError when a Fail has no recover frame", () => {
    const task: Task<unknown> = fail<number>({ code: "BOOM", message: "boom" });

    expect(() => driveSync(task, failIfCalled)).toThrow(TaskExecutionError);
  });

  it("routes a TaskExecutionError thrown by resolveEffect to recover", () => {
    const task: Task<unknown> = recover(
      effect<string>({ _tag: "ReadFile", path: "/x" }),
      (err) => pure(`recovered:${err.code}`),
    );

    const value = driveSync(task, () => {
      throw new TaskExecutionError({ code: "IO", message: "io" });
    });

    expect(value).toBe("recovered:IO");
  });

  it("propagates a non-TaskExecutionError thrown by resolveEffect", () => {
    const task: Task<unknown> = effect<string>({
      _tag: "ReadFile",
      path: "/x",
    });

    expect(() =>
      driveSync(task, () => {
        throw new Error("raw");
      }),
    ).toThrow("raw");
  });

  it("discards recover frames on the success path", () => {
    const task: Task<unknown> = flatMap(
      recover(pure(1), () => pure(-1)),
      (x) => pure(x + 1),
    );

    expect(driveSync(task, failIfCalled)).toBe(2);
  });

  it("is stack-safe on a deep flatMap chain", () => {
    let task: Task<number> = pure(0);
    for (let i = 0; i < 100_000; i++) {
      task = flatMap(task, (x) => pure(x + 1));
    }

    expect(driveSync(task, failIfCalled)).toBe(100_000);
  });
});
