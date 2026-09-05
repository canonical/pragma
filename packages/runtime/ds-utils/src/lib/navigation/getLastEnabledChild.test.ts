import type { _Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import getLastEnabledChild from "./getLastEnabledChild.js";

describe("getLastEnabledChild", () => {
  it("returns last non-disabled child", () => {
    const item: _Item = {
      key: "parent",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/a", parentUrl: "parent", depth: 1 },
        { url: "/b", parentUrl: "parent", depth: 1 },
      ],
    };
    expect(getLastEnabledChild(item)?.url).toBe("/b");
  });

  it("skips trailing disabled children", () => {
    const item: _Item = {
      key: "parent",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/a", parentUrl: "parent", depth: 1 },
        { url: "/b", disabled: true, parentUrl: "parent", depth: 1 },
      ],
    };
    expect(getLastEnabledChild(item)?.url).toBe("/a");
  });

  it("returns undefined for item with no children", () => {
    const item: _Item = { key: "leaf", parentUrl: null, depth: 0 };
    expect(getLastEnabledChild(item)).toBeUndefined();
  });

  it("returns undefined when all children are disabled", () => {
    const item: _Item = {
      key: "parent",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/a", disabled: true, parentUrl: "parent", depth: 1 },
        { url: "/b", disabled: true, parentUrl: "parent", depth: 1 },
      ],
    };
    expect(getLastEnabledChild(item)).toBeUndefined();
  });
});
