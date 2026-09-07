import type { _Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import getLastInteractiveChild from "./getLastInteractiveChild.js";

describe("getLastInteractiveChild", () => {
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
    expect(getLastInteractiveChild(item)?.url).toBe("/b");
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
    expect(getLastInteractiveChild(item)?.url).toBe("/a");
  });

  it("returns undefined for item with no children", () => {
    const item: _Item = { key: "leaf", parentUrl: null, depth: 0 };
    expect(getLastInteractiveChild(item)).toBeUndefined();
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
    expect(getLastInteractiveChild(item)).toBeUndefined();
  });
  it("skips presentational children", () => {
    const item: _Item = {
      key: "parent",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/a", parentUrl: "parent", depth: 1 },
        { key: "sep", presentational: true, parentUrl: "parent", depth: 1 },
      ],
    };
    expect(getLastInteractiveChild(item)?.url).toBe("/a");
  });

  it("returns undefined when every child is presentational or disabled", () => {
    const item: _Item = {
      key: "parent",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/a", disabled: true, parentUrl: "parent", depth: 1 },
        { key: "sep", presentational: true, parentUrl: "parent", depth: 1 },
      ],
    };
    expect(getLastInteractiveChild(item)).toBeUndefined();
  });
});
