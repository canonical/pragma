import { describe, expect, it } from "vitest";
import getCommentStyle from "./getCommentStyle.js";

describe("getCommentStyle", () => {
  it.each([
    [".ts", "//", "/*", "*/"],
    [".tsx", "//", "/*", "*/"],
    [".js", "//", "/*", "*/"],
    [".jsx", "//", "/*", "*/"],
    [".mjs", "//", "/*", "*/"],
    [".cjs", "//", "/*", "*/"],
    [".scss", "//", "/*", "*/"],
    [".sass", "//", undefined, undefined],
    [".less", "//", "/*", "*/"],
    [".go", "//", "/*", "*/"],
    [".rs", "//", "/*", "*/"],
    [".java", "//", "/*", "*/"],
    [".kt", "//", "/*", "*/"],
    [".swift", "//", "/*", "*/"],
    [".c", "//", "/*", "*/"],
    [".cpp", "//", "/*", "*/"],
    [".h", "//", "/*", "*/"],
    [".hpp", "//", "/*", "*/"],
    [".php", "//", "/*", "*/"],
  ])("returns single-line '//' style for %s", (ext, single, blockStart, blockEnd) => {
    const style = getCommentStyle(`file${ext}`);
    expect(style).not.toBeNull();
    expect(style?.single).toBe(single);
    expect(style?.blockStart).toBe(blockStart);
    expect(style?.blockEnd).toBe(blockEnd);
  });

  it.each([
    [".css", "/*", "*/", true],
  ])("returns block style with preferBlock for %s", (ext, start, end, pref) => {
    const style = getCommentStyle(`file${ext}`);
    expect(style).not.toBeNull();
    expect(style?.blockStart).toBe(start);
    expect(style?.blockEnd).toBe(end);
    expect(style?.preferBlock).toBe(pref);
  });

  it.each([
    [".html", "<!--", "-->"],
    [".htm", "<!--", "-->"],
    [".xml", "<!--", "-->"],
    [".svg", "<!--", "-->"],
    [".vue", "<!--", "-->"],
    [".svelte", "<!--", "-->"],
    [".md", "<!--", "-->"],
  ])("returns HTML comment style for %s", (ext, start, end) => {
    const style = getCommentStyle(`file${ext}`);
    expect(style).not.toBeNull();
    expect(style?.blockStart).toBe(start);
    expect(style?.blockEnd).toBe(end);
  });

  it("returns JSX comment style for .mdx", () => {
    const style = getCommentStyle("file.mdx");
    expect(style).not.toBeNull();
    expect(style?.blockStart).toBe("{/*");
    expect(style?.blockEnd).toBe("*/}");
  });

  it.each([
    [".yaml", "#"],
    [".yml", "#"],
    [".toml", "#"],
    [".sh", "#"],
    [".bash", "#"],
    [".zsh", "#"],
    [".fish", "#"],
    [".py", "#"],
    [".rb", "#"],
    [".pl", "#"],
  ])("returns hash comment style for %s", (ext, single) => {
    const style = getCommentStyle(`file${ext}`);
    expect(style).not.toBeNull();
    expect(style?.single).toBe(single);
  });

  it("returns '--' comment style for .sql", () => {
    const style = getCommentStyle("file.sql");
    expect(style).not.toBeNull();
    expect(style?.single).toBe("--");
    expect(style?.blockStart).toBe("/*");
    expect(style?.blockEnd).toBe("*/");
  });

  it("returns empty object (no comment fields) for .json", () => {
    const style = getCommentStyle("file.json");
    expect(style).not.toBeNull();
    expect(style?.single).toBeUndefined();
    expect(style?.blockStart).toBeUndefined();
  });

  it("returns null for unknown extensions", () => {
    expect(getCommentStyle("file.dat")).toBeNull();
    expect(getCommentStyle("file.bin")).toBeNull();
    expect(getCommentStyle("file.xyz")).toBeNull();
  });

  it("returns null for extensionless files", () => {
    expect(getCommentStyle("Makefile")).toBeNull();
  });

  it("handles uppercase extensions via lowercase normalization", () => {
    const style = getCommentStyle("file.TS");
    expect(style).not.toBeNull();
    expect(style?.single).toBe("//");
  });
});
