import type { _Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import getFirstEnabledLeaf from "./getFirstEnabledLeaf.js";

describe("getFirstEnabledLeaf", () => {
  it("descends through a group layer to the first menuitem (root → group → item)", () => {
    const root: _Item = {
      key: "root",
      parentUrl: null,
      depth: 0,
      items: [
        {
          key: "group-a",
          parentUrl: "root",
          depth: 1,
          items: [
            { url: "/a1", parentUrl: "group-a", depth: 2 },
            { url: "/a2", parentUrl: "group-a", depth: 2 },
          ],
        },
      ],
    };
    // Not the group ("group-a"), but its first item.
    expect(getFirstEnabledLeaf(root)?.url).toBe("/a1");
  });

  it("returns the first child for a flat root → item tree (no group layer)", () => {
    const root: _Item = {
      key: "root",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/a", parentUrl: "root", depth: 1 },
        { url: "/b", parentUrl: "root", depth: 1 },
      ],
    };
    expect(getFirstEnabledLeaf(root)?.url).toBe("/a");
  });

  it("skips disabled nodes while descending", () => {
    const root: _Item = {
      key: "root",
      parentUrl: null,
      depth: 0,
      items: [
        // First group is entirely disabled → skip to the next.
        {
          key: "group-a",
          parentUrl: "root",
          depth: 1,
          disabled: true,
          items: [{ url: "/a1", parentUrl: "group-a", depth: 2 }],
        },
        {
          key: "group-b",
          parentUrl: "root",
          depth: 1,
          items: [
            { url: "/b1", disabled: true, parentUrl: "group-b", depth: 2 },
            { url: "/b2", parentUrl: "group-b", depth: 2 },
          ],
        },
      ],
    };
    expect(getFirstEnabledLeaf(root)?.url).toBe("/b2");
  });

  it("returns undefined when the subtree has no enabled leaf", () => {
    const root: _Item = {
      key: "root",
      parentUrl: null,
      depth: 0,
      items: [
        {
          key: "group-a",
          parentUrl: "root",
          depth: 1,
          items: [{ url: "/a1", disabled: true, parentUrl: "group-a", depth: 2 }],
        },
      ],
    };
    expect(getFirstEnabledLeaf(root)).toBeUndefined();
  });

  it("returns undefined for a childless root", () => {
    const root: _Item = { key: "root", parentUrl: null, depth: 0 };
    expect(getFirstEnabledLeaf(root)).toBeUndefined();
  });
});
