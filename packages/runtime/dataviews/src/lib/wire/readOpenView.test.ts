import { describe, expect, it } from "vitest";
import readOpenView from "./readOpenView.js";

describe("readOpenView", () => {
  it("reads the view a location has open beside its query", () => {
    expect(
      readOpenView(new URLSearchParams("status=failed&view=v1&page=2")),
    ).toBe("v1");
  });

  it("reads no view where none is named, or the name is blank", () => {
    expect(readOpenView(new URLSearchParams("status=failed"))).toBeNull();
    expect(readOpenView(new URLSearchParams("view="))).toBeNull();
  });

  it("takes the first view named, past a blank one", () => {
    expect(readOpenView(new URLSearchParams("view=&view=v2&view=v3"))).toBe(
      "v2",
    );
  });
});
