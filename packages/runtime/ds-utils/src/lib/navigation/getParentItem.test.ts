import { describe, expect, it } from "vitest";
import { annotateTree } from "./annotateTree.js";
import getParentItem from "./getParentItem.js";
import { prepareIndex } from "./prepareIndex.js";

const tree = {
  key: "root",
  label: "Root",
  items: [{ url: "/a", label: "A", items: [{ url: "/a/1", label: "A1" }] }],
};

const root = annotateTree(tree);
const index = prepareIndex(root);

describe("getParentItem", () => {
  it("returns parent for a child item", () => {
    expect(getParentItem(index, index["/a/1"])?.url).toBe("/a");
  });

  it("returns root for a depth-1 item", () => {
    expect(getParentItem(index, index["/a"])?.key).toBe("root");
  });

  it("returns undefined for root item", () => {
    expect(getParentItem(index, root)).toBeUndefined();
  });
});
