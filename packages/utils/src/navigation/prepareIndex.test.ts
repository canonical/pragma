import type { _Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import { prepareIndex } from "./prepareIndex.js";

describe("prepareIndex", () => {
  it("indexes a single root item by url", () => {
    const root: _Item = { url: "/home", parentUrl: null, depth: 0 };
    const index = prepareIndex(root);

    expect(index["/home"]).toBe(root);
  });

  it("indexes nested items by their urls", () => {
    const child: _Item = {
      url: "/child",
      parentUrl: "/parent",
      depth: 1,
    };
    const root: _Item = {
      url: "/parent",
      parentUrl: null,
      depth: 0,
      items: [child],
    };
    const index = prepareIndex(root);

    expect(index["/parent"]).toBe(root);
    expect(index["/child"]).toBe(child);
  });

  it("indexes items by key when url is absent", () => {
    const root: _Item = {
      key: "section",
      parentUrl: null,
      depth: 0,
    };
    const index = prepareIndex(root);

    expect(index.section).toBe(root);
  });

  it("indexes deeply nested trees", () => {
    const grandchild: _Item = {
      url: "/c",
      parentUrl: "/b",
      depth: 2,
    };
    const child: _Item = {
      url: "/b",
      parentUrl: "/a",
      depth: 1,
      items: [grandchild],
    };
    const root: _Item = {
      url: "/a",
      parentUrl: null,
      depth: 0,
      items: [child],
    };
    const index = prepareIndex(root);

    expect(Object.keys(index)).toHaveLength(3);
    expect(index["/a"]).toBe(root);
    expect(index["/b"]).toBe(child);
    expect(index["/c"]).toBe(grandchild);
  });

  it("indexes multiple siblings", () => {
    const child1: _Item = {
      url: "/child-1",
      parentUrl: "/root",
      depth: 1,
    };
    const child2: _Item = {
      url: "/child-2",
      parentUrl: "/root",
      depth: 1,
    };
    const root: _Item = {
      url: "/root",
      parentUrl: null,
      depth: 0,
      items: [child1, child2],
    };
    const index = prepareIndex(root);

    expect(Object.keys(index)).toHaveLength(3);
    expect(index["/child-1"]).toBe(child1);
    expect(index["/child-2"]).toBe(child2);
  });
});
