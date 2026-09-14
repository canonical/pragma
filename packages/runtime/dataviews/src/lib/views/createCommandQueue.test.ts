import { describe, expect, it, vi } from "vitest";
import createDeferred from "../../../testing/createDeferred.js";
import createCommandQueue from "./createCommandQueue.js";
import type { ViewsState } from "./types.js";

describe("createCommandQueue", () => {
  it("runs commands one at a time, in call order, publishing pending then settled", async () => {
    const published: Partial<ViewsState>[] = [];
    const queue = createCommandQueue({
      publish: (changed) => {
        published.push(changed);
      },
    });
    const first = createDeferred<void>();
    const opening = queue.run("open", () => async () => {
      await first.promise;
      return {
        outcome: { status: "removed" },
        apply: () => ({ current: null }),
      };
    });
    const prepare = vi.fn(() => async () => ({
      outcome: { status: "missing" } as const,
    }));
    const saving = queue.run("save", prepare);
    await new Promise((settle) => setTimeout(settle));
    // The second command is not even prepared before the first settles.
    expect(prepare).not.toHaveBeenCalled();
    first.resolve();
    expect(await opening).toEqual({ status: "removed" });
    expect(await saving).toEqual({ status: "missing" });
    expect(published).toEqual([
      { command: { command: "open", status: "pending" } },
      {
        current: null,
        command: {
          command: "open",
          status: "settled",
          outcome: { status: "removed" },
        },
      },
      { command: { command: "save", status: "pending" } },
      {
        command: {
          command: "save",
          status: "settled",
          outcome: { status: "missing" },
        },
      },
    ]);
  });

  it("answers a refusal at once, publishing it unless it is a refused name", async () => {
    const publish = vi.fn();
    const queue = createCommandQueue({ publish });
    expect(
      await queue.run("save-as", () => ({
        status: "invalid",
        reason: "empty",
      })),
    ).toEqual({ status: "invalid", reason: "empty" });
    expect(publish).not.toHaveBeenCalled();
    expect(await queue.run("save", () => ({ status: "missing" }))).toEqual({
      status: "missing",
    });
    expect(publish).toHaveBeenCalledWith({
      command: {
        command: "save",
        status: "settled",
        outcome: { status: "missing" },
      },
    });
  });

  it("settles a store that rejects as failed", async () => {
    const publish = vi.fn();
    const queue = createCommandQueue({ publish });
    expect(
      await queue.run("remove", () => async () => {
        throw new Error("view storage failed: quota exceeded");
      }),
    ).toEqual({
      status: "failed",
      reason: "view storage failed: quota exceeded",
    });
  });

  it("lets a command still in flight when the generation moves answer its caller and change nothing", async () => {
    const publish = vi.fn();
    const queue = createCommandQueue({ publish });
    const gate = createDeferred<void>();
    const apply = vi.fn(() => ({ current: null }));
    const opening = queue.run("open", () => async () => {
      await gate.promise;
      return { outcome: { status: "removed" }, apply };
    });
    await new Promise((settle) => setTimeout(settle));
    queue.abandon();
    gate.resolve();
    expect(await opening).toEqual({ status: "removed" });
    expect(apply).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("rejects only the command whose publication throws", async () => {
    const publish = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("listener failed");
      })
      .mockImplementation(() => {});
    const queue = createCommandQueue({ publish });
    await expect(
      queue.run("save", () => ({ status: "missing" })),
    ).rejects.toThrow("listener failed");
    expect(await queue.run("save", () => ({ status: "missing" }))).toEqual({
      status: "missing",
    });
  });
});
