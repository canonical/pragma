import type { Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import { annotateTree } from "./annotateTree.js";

describe("annotateTree", () => {
  it("annotates a single root item with depth 0 and null parentUrl", () => {
    const root: Item = { url: "/home", label: "Home" };
    const result = annotateTree(root);

    expect(result).toEqual({
      url: "/home",
      label: "Home",
      parentUrl: null,
      depth: 0,
    });
  });

  it("annotates children with parent url and incremented depth", () => {
    const root: Item = {
      url: "/parent",
      label: "Parent",
      items: [
        { url: "/child-1", label: "Child 1" },
        { url: "/child-2", label: "Child 2" },
      ],
    };
    const result = annotateTree(root);

    expect(result.depth).toBe(0);
    expect(result.parentUrl).toBeNull();
    expect(result.items).toHaveLength(2);
    expect(result.items?.[0]).toEqual({
      url: "/child-1",
      label: "Child 1",
      parentUrl: "/parent",
      depth: 1,
    });
    expect(result.items?.[1]).toEqual({
      url: "/child-2",
      label: "Child 2",
      parentUrl: "/parent",
      depth: 1,
    });
  });

  it("annotates deeply nested trees", () => {
    const root: Item = {
      url: "/a",
      items: [
        {
          url: "/b",
          items: [{ url: "/c" }],
        },
      ],
    };
    const result = annotateTree(root);

    const grandchild = result.items?.[0]?.items?.[0];
    expect(grandchild).toEqual({
      url: "/c",
      parentUrl: "/b",
      depth: 2,
    });
  });

  it("uses key-based identification for parent references", () => {
    const root: Item = {
      key: "root-section",
      items: [{ url: "/child" }],
    };
    const result = annotateTree(root);

    expect(result.items?.[0]?.parentUrl).toBe("root-section");
  });

  it("preserves extra properties on items", () => {
    const root: Item = {
      url: "/home",
      label: "Home",
      className: "active",
      disabled: true,
    };
    const result = annotateTree(root);

    expect(result.className).toBe("active");
    expect(result.disabled).toBe(true);
  });

  it("handles items without children", () => {
    const root: Item = { url: "/leaf" };
    const result = annotateTree(root);

    expect(result.items).toBeUndefined();
  });
});
