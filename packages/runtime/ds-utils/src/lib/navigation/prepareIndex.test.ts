import { describe, expect, it, vi } from "vitest";
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

    expect(index.root).toBe(root);
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
    expect(index.root).toBe(root);
  });

  it("warns in development when two items share a url, keeping the last in the index", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tree = {
        key: "root",
        label: "Root",
        items: [
          { url: "/approvals", label: "Approvals" },
          { url: "/approvals", label: "Requests" },
        ],
      };
      const root = annotateTree(tree);
      const index = prepareIndex(root);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('"/approvals"');
      expect(warn.mock.calls[0]?.[0]).toContain("Approvals");
      expect(warn.mock.calls[0]?.[0]).toContain("Requests");
      expect(index["/approvals"]?.label).toBe("Requests");
    } finally {
      warn.mockRestore();
    }
  });

  it("warns in development when two items share a key", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tree = {
        key: "root",
        label: "Root",
        items: [
          { key: "dup", label: "One" },
          { key: "dup", label: "Two" },
        ],
      };
      const root = annotateTree(tree);
      const index = prepareIndex(root);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('"dup"');
      expect(warn.mock.calls[0]?.[0]).toContain("One");
      expect(warn.mock.calls[0]?.[0]).toContain("Two");
      expect(index.dup?.label).toBe("Two");
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn when ids are unique", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tree = {
        key: "root",
        label: "Root",
        items: [
          { url: "/a", label: "A" },
          { key: "b", label: "B" },
        ],
      };
      const root = annotateTree(tree);
      prepareIndex(root);

      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
