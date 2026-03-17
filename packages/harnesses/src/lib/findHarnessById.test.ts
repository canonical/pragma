import { describe, expect, it } from "vitest";
import findHarnessById from "./findHarnessById.js";

describe("findHarnessById", () => {
  it("returns the harness for a known ID", () => {
    const result = findHarnessById("cursor");
    expect(result).toBeDefined();
    expect(result?.name).toBe("Cursor");
  });

  it("returns undefined for an unknown ID", () => {
    expect(findHarnessById("nonexistent")).toBeUndefined();
  });
});
