import { describe, expect, it } from "vitest";
import { annotateTree } from "./annotateTree.js";
import { prepareIndex } from "./prepareIndex.js";

describe("prepareIndex", () => {
  it("creates flat index from annotated tree", () => {
    const tree = {
      key: "root",
      label: "Root",
      items: [
        { url: "/a", label: "A" },
        { url: "/b", label: "B" },
      ],
    };
    const root = annotateTree(tree);
    const index = prepareIndex(root);

    expect(index["root"]).toBe(root);
    expect(index["/a"]?.url).toBe("/a");
    expect(index["/b"]?.url).toBe("/b");
  });

  it("indexes nested items", () => {
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

    expect(index["/a/1"]?.url).toBe("/a/1");
    expect(index["/a/1"]?.depth).toBe(2);
  });

  it("handles single root with no children", () => {
    const tree = { key: "root", label: "Root" };
    const root = annotateTree(tree);
    const index = prepareIndex(root);

    expect(Object.keys(index)).toHaveLength(1);
    expect(index["root"]).toBe(root);
  });
});
