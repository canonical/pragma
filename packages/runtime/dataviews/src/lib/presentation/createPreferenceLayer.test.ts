import { describe, expect, it } from "vitest";
import createPreferenceLayer from "./createPreferenceLayer.js";

describe("createPreferenceLayer", () => {
  it("changes keys at once, removing one set to undefined, and remembers which change wrote each", () => {
    const layer = createPreferenceLayer();
    layer.change({ width: 100, height: 20 }, 1);
    layer.change({ height: undefined, depth: 3 }, 2);
    expect(layer.values).toEqual({ width: 100, depth: 3 });
    expect(layer.readChangeToken("width")).toBe(1);
    expect(layer.readChangeToken("height")).toBe(2);
    expect(layer.readChangeToken("never")).toBeUndefined();
  });

  it("settles a read, keeping a change made since the read began and a removal too", () => {
    const layer = createPreferenceLayer();
    layer.change({ width: 100 }, 1);
    layer.change({ height: 20, depth: undefined }, 2);
    // The read began after change 1 was sent and before change 2 was.
    layer.settle({ width: 90, height: 30, depth: 4, other: 5 }, 1);
    expect(layer.values).toEqual({ width: 90, height: 20, other: 5 });
  });

  it("keeps a key whose write failed through a read, until it is written", () => {
    const layer = createPreferenceLayer();
    layer.change({ width: 100 }, 1);
    layer.markFailed(["width"]);
    expect(layer.hasFailed()).toBe(true);
    expect(layer.listUnsaved()).toEqual({ width: 100 });
    layer.settle({ width: 90 }, 1);
    expect(layer.values).toEqual({ width: 100 });
    layer.markWritten(["width"]);
    expect(layer.hasFailed()).toBe(false);
    expect(layer.listUnsaved()).toEqual({});
    layer.settle({ width: 90 }, 1);
    expect(layer.values).toEqual({ width: 90 });
  });

  it("reads a failed key that was removed meanwhile as removed", () => {
    const layer = createPreferenceLayer();
    layer.change({ width: 100 }, 1);
    layer.markFailed(["width"]);
    layer.change({ width: undefined }, 2);
    layer.settle({ width: 90 }, 2);
    expect(layer.values).toEqual({});
    // A key named for a prototype member has no value of its own either.
    layer.change({ toString: undefined }, 3);
    layer.settle({ toString: "x" }, 2);
    expect(layer.values).toEqual({});
  });
});
