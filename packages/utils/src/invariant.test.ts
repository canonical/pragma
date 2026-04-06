import { describe, expect, it } from "vitest";
import invariant from "./invariant.js";

describe("invariant", () => {
  it("does not throw when the condition is truthy", () => {
    expect(() => invariant(true)).not.toThrow();
    expect(() => invariant(1)).not.toThrow();
    expect(() => invariant("non-empty")).not.toThrow();
  });

  it("throws with default prefix when condition is falsy and no message", () => {
    expect(() => invariant(false)).toThrow("Invariant violation");
  });

  it("throws with a string message", () => {
    expect(() => invariant(false, "something went wrong")).toThrow(
      "Invariant violation: something went wrong",
    );
  });

  it("throws with a lazy message function", () => {
    expect(() => invariant(false, () => "computed message")).toThrow(
      "Invariant violation: computed message",
    );
  });

  it("throws with a custom prefix", () => {
    expect(() => invariant(false, "details", "Custom Error")).toThrow(
      "Custom Error: details",
    );
  });

  it("throws with custom prefix and no message", () => {
    expect(() => invariant(false, undefined, "Custom Error")).toThrow(
      "Custom Error",
    );
  });

  it("narrows the type after assertion", () => {
    const value: string | undefined = "hello";
    invariant(value !== undefined, "Expected value");
    // TypeScript should now narrow `value` to `string`
    expect(value.toUpperCase()).toBe("HELLO");
  });
});
