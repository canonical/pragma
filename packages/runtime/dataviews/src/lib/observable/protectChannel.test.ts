import { describe, expect, it } from "vitest";
import createChannel from "./createChannel.js";
import protectChannel from "./protectChannel.js";

describe("protectChannel", () => {
  it("reads and subscribes through to the channel", () => {
    const channel = createChannel(1);
    const view = protectChannel(channel);
    let notified = 0;
    const release = view.subscribe(() => {
      notified += 1;
    });
    channel.set(2);
    expect(view.get()).toBe(2);
    expect(notified).toBe(1);
    release();
    channel.set(3);
    expect(notified).toBe(1);
  });

  it("hands out no way to write, at runtime", () => {
    const channel = createChannel(1);
    const view = protectChannel(channel);
    expect(Object.isFrozen(view)).toBe(true);
    expect("set" in view).toBe(false);
    expect(Object.keys(view).sort()).toEqual(["get", "subscribe"]);
    // A consumer that casts its way to a `set` finds nothing to call.
    expect((view as Partial<typeof channel>).set).toBeUndefined();
    expect(() => {
      (view as { set?: unknown }).set = () => {};
    }).toThrow(TypeError);
    expect(channel.get()).toBe(1);
  });
});
