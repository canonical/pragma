import { describe, expect, it } from "vitest";
import invariant from "./invariant.js";

describe("invariant", () => {
  it("does not throw for truthy condition", () => {
    expect(() => invariant(true)).not.toThrow();
    expect(() => invariant(1)).not.toThrow();
    expect(() => invariant("non-empty")).not.toThrow();
  });

  it("throws with default prefix for falsy condition", () => {
    expect(() => invariant(false)).toThrow("Invariant violation");
  });

  it("throws with string message", () => {
    expect(() => invariant(false, "something went wrong")).toThrow(
      "Invariant violation: something went wrong",
    );
  });

  it("throws with lazy message function", () => {
    expect(() => invariant(false, () => "computed message")).toThrow(
      "Invariant violation: computed message",
    );
  });

  it("throws with custom prefix", () => {
    expect(() => invariant(false, "detail", "Type Error")).toThrow(
      "Type Error: detail",
    );
  });
});
