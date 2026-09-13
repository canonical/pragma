import { describe, expect, it } from "vitest";
import describeError from "./describeError.js";

describe("describeError", () => {
  it("reads an error's message, and its name when the message is empty", () => {
    expect(describeError(new Error("gateway down"))).toBe("gateway down");
    expect(describeError(new Error())).toBe("Error");
  });

  it("reads a non-error by its string form", () => {
    expect(describeError("gateway timeout")).toBe("gateway timeout");
    expect(describeError(503)).toBe("503");
  });

  it("names a value with no string form at all", () => {
    expect(describeError(Object.create(null))).toBe("unknown error");
  });
});
