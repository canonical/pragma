import { describe, expect, it } from "vitest";
import readStoredId from "./readStoredId.js";

describe("readStoredId", () => {
  it("reads the id a record claims as text, whatever it holds", () => {
    expect(readStoredId({ id: 7 })).toBe("7");
    expect(readStoredId({ name: "no id" })).toBe("undefined");
    expect(readStoredId(null)).toBe("undefined");
  });
});
