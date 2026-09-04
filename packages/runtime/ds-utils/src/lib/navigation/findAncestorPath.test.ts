import { describe, expect, it } from "vitest";
import { annotateTree } from "./annotateTree.js";
import findAncestorPath from "./findAncestorPath.js";
import { prepareIndex } from "./prepareIndex.js";

const tree = {
  key: "root",
  label: "Root",
  items: [
    {
      url: "/a",
      label: "A",
      items: [{ url: "/a/1", label: "A1" }],
    },
  ],
};

const root = annotateTree(tree);
const index = prepareIndex(root);

describe("findAncestorPath", () => {
  it("returns path from root to nested item", () => {
    const path = findAncestorPath(index, index["/a/1"]);
    expect(path).toHaveLength(3);
    expect(path[0].key).toBe("root");
    expect(path[1].url).toBe("/a");
    expect(path[2].url).toBe("/a/1");
  });

  it("returns single-item path for root", () => {
    const path = findAncestorPath(index, root);
    expect(path).toHaveLength(1);
    expect(path[0].key).toBe("root");
  });

  it("returns two-item path for direct child", () => {
    const path = findAncestorPath(index, index["/a"]);
    expect(path).toHaveLength(2);
  });
});
