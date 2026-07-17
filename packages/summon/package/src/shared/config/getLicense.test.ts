import { describe, expect, it } from "vitest";
import getLicense from "./getLicense.js";

describe("getLicense", () => {
  it("returns GPL-3.0 for tool", () => {
    expect(getLicense("tool")).toBe("GPL-3.0");
  });

  it("returns LGPL-3.0 for library", () => {
    expect(getLicense("library")).toBe("LGPL-3.0");
  });

  it("returns LGPL-3.0 for css", () => {
    expect(getLicense("css")).toBe("LGPL-3.0");
  });
});
