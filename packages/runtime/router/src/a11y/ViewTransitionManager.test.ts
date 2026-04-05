import { describe, expect, it, vi } from "vitest";
import ViewTransitionManager from "./ViewTransitionManager.js";

describe("ViewTransitionManager", () => {
  it("falls back to a direct update when startViewTransition is unavailable", async () => {
    const update = vi.fn(async () => {});
    const manager = new ViewTransitionManager({});

    await manager.run(update);

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("wraps updates in document.startViewTransition when available", async () => {
    const calls: string[] = [];
    const manager = new ViewTransitionManager({
      startViewTransition(update) {
        calls.push("start");

        const finished = Promise.resolve().then(() => {
          calls.push("finished");
        });

        void update();

        return { finished };
      },
    });

    await manager.run(async () => {
      calls.push("update");
    });

    expect(calls).toEqual(["start", "update", "finished"]);
  });

  it("waits for finished even when the transition callback does not run", async () => {
    const update = vi.fn(async () => {});
    const calls: string[] = [];
    const manager = new ViewTransitionManager({
      startViewTransition() {
        calls.push("start");

        return {
          finished: Promise.resolve().then(() => {
            calls.push("finished");
          }),
        };
      },
    });

    await manager.run(update);

    expect(update).not.toHaveBeenCalled();
    expect(calls).toEqual(["start", "finished"]);
  });
});
