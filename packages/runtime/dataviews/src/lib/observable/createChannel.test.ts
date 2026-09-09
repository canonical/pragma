import { describe, expect, it } from "vitest";
import createChannel from "./createChannel.js";

describe("createChannel", () => {
  it("holds the initial snapshot until a set", () => {
    const channel = createChannel(1);
    expect(channel.get()).toBe(1);
  });

  it("notifies subscribers on set, in subscription order", () => {
    const channel = createChannel(0);
    const calls: string[] = [];
    channel.subscribe(() => calls.push("first"));
    channel.subscribe(() => calls.push("second"));
    channel.set(1);
    expect(calls).toEqual(["first", "second"]);
    expect(channel.get()).toBe(1);
  });

  it("makes the new value readable during its own notification", () => {
    const channel = createChannel(0);
    const observed: number[] = [];
    channel.subscribe(() => observed.push(channel.get()));
    channel.set(42);
    expect(observed).toEqual([42]);
  });

  it("keeps the previous reference when a set is equality-rejected", () => {
    const channel = createChannel(
      { value: 1 },
      {
        equals: (a, b) => a.value === b.value,
      },
    );
    const before = channel.get();
    channel.set({ value: 1 });
    expect(channel.get()).toBe(before);
  });

  it("skips notification when the equality guard says unchanged", () => {
    const channel = createChannel(
      { value: 1 },
      {
        equals: (a, b) => a.value === b.value,
      },
    );
    let notifications = 0;
    channel.subscribe(() => {
      notifications += 1;
    });
    expect(channel.set({ value: 1 })).toBe(false);
    expect(notifications).toBe(0);
    expect(channel.set({ value: 2 })).toBe(true);
    expect(notifications).toBe(1);
  });

  it("uses reference equality by default", () => {
    const channel = createChannel({ value: 1 });
    let notifications = 0;
    channel.subscribe(() => {
      notifications += 1;
    });
    expect(channel.set({ value: 1 })).toBe(true);
    expect(notifications).toBe(1);
  });

  it("unsubscribes through the returned function", () => {
    const channel = createChannel(0);
    let notifications = 0;
    const unsubscribe = channel.subscribe(() => {
      notifications += 1;
    });
    channel.set(1);
    unsubscribe();
    channel.set(2);
    expect(notifications).toBe(1);
  });

  it("supports unsubscribing from inside a notification", () => {
    const channel = createChannel(0);
    const calls: number[] = [];
    const unsubscribe = channel.subscribe(() => {
      calls.push(1);
      unsubscribe();
    });
    channel.subscribe(() => calls.push(2));
    channel.set(1);
    channel.set(2);
    expect(calls).toEqual([1, 2, 2]);
  });

  it("still delivers to a later listener unsubscribed mid-notification", () => {
    const channel = createChannel(0);
    const calls: string[] = [];
    let unsubscribeLate: () => void = () => {};
    channel.subscribe(() => {
      calls.push("first");
      unsubscribeLate();
    });
    unsubscribeLate = channel.subscribe(() => calls.push("late"));
    // The first listener unsubscribes the late one during a notification;
    // the snapshot iteration still delivers to it that round.
    channel.set(1);
    expect(calls).toEqual(["first", "late"]);
    calls.length = 0;
    channel.set(2);
    expect(calls).toEqual(["first"]);
  });

  it("does not deliver to a listener subscribed during a notification", () => {
    const channel = createChannel(0);
    const calls: string[] = [];
    channel.subscribe(() => {
      calls.push("existing");
      channel.subscribe(() => calls.push("late-addition"));
    });
    channel.set(1);
    // The snapshot was taken before the new subscription existed.
    expect(calls).toEqual(["existing"]);
    channel.set(2);
    expect(calls).toEqual(["existing", "existing", "late-addition"]);
  });

  it("propagates listener exceptions to the publisher", () => {
    const channel = createChannel(0);
    channel.subscribe(() => {
      throw new Error("listener exploded");
    });
    expect(() => channel.set(1)).toThrow("listener exploded");
    // The new value is committed even though publication aborted.
    expect(channel.get()).toBe(1);
  });

  it("keeps the snapshot referentially stable between sets", () => {
    const channel = createChannel(0);
    channel.set(1);
    expect(channel.get()).toBe(channel.get());
  });
});
