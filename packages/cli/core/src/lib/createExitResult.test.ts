import { describe, expect, it } from "vitest";
import createExitResult from "./createExitResult.js";

describe("createExitResult", () => {
  it("creates a result with tag exit and code 0", () => {
    const result = createExitResult(0);
    expect(result.tag).toBe("exit");
    expect(result.code).toBe(0);
  });

  it("accepts non-zero exit codes", () => {
    const result = createExitResult(3);
    expect(result.code).toBe(3);
  });
});
