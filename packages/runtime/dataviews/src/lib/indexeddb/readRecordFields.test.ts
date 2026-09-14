import { describe, expect, it } from "vitest";
import readRecordFields from "./readRecordFields.js";

describe("readRecordFields", () => {
  it("reads an object's fields and nothing else's", () => {
    expect(readRecordFields({ id: 1 })).toEqual({ id: 1 });
    expect(readRecordFields(null)).toBeNull();
    expect(readRecordFields("record")).toBeNull();
  });
});
