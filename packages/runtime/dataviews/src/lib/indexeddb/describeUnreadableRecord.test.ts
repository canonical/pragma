import { describe, expect, it } from "vitest";
import describeUnreadableRecord from "./describeUnreadableRecord.js";

describe("describeUnreadableRecord", () => {
  it("names the version a record carries, or its shape when the version is right", () => {
    expect(describeUnreadableRecord({ v: 2, id: "a" })).toBe(
      "record version 2 is not the supported version 1",
    );
    expect(describeUnreadableRecord({ v: 1, id: 7 })).toBe(
      "the record does not have the shape of a saved view",
    );
    // A record that is no object has no version to name.
    expect(describeUnreadableRecord("garbage")).toBe(
      "record version undefined is not the supported version 1",
    );
  });
});
