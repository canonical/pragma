import { describe, expect, it } from "vitest";
import indent from "./indent.js";

describe("indent", () => {
  it("indents a single line", () => {
    expect(indent("hello", 2)).toBe("  hello");
  });

  it("indents every line of a multi-line string", () => {
    expect(indent("a\nb\nc", 4)).toBe("    a\n    b\n    c");
  });

  it("handles zero spaces", () => {
    expect(indent("hello", 0)).toBe("hello");
  });
});
