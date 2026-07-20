import { TaskExecutionError } from "@canonical/task";
import { describe, expect, it } from "vitest";
import {
  asPragmaError,
  CANCELLED_MESSAGE,
  isCancellation,
  isInterruption,
} from "./fromTaskError.js";
import { PragmaError } from "./PragmaError.js";

describe("fromTaskError bridge", () => {
  it("recognises a declined confirm gate as a cancellation", () => {
    const err = new TaskExecutionError({
      code: "GENERATOR_CANCELLED",
      message: "Cancelled.",
    });
    expect(isCancellation(err)).toBe(true);
    expect(CANCELLED_MESSAGE).toBe("Cancelled.");
  });

  it("does not treat other failures as cancellations", () => {
    expect(isCancellation(new Error("boom"))).toBe(false);
    expect(
      isCancellation(
        new TaskExecutionError({ code: "INTERNAL", message: "boom" }),
      ),
    ).toBe(false);
    expect(isCancellation("nope")).toBe(false);
    expect(isCancellation(null)).toBe(false);
    // An interrupt is NOT a cancellation (different exit code).
    expect(
      isCancellation(
        new TaskExecutionError({ code: "TASK_INTERRUPTED", message: "x" }),
      ),
    ).toBe(false);
  });

  it("recognises an interpreter interrupt (SIGINT / in-wizard Ctrl-C mid-run)", () => {
    const err = new TaskExecutionError({
      code: "TASK_INTERRUPTED",
      message: "Task interrupted",
    });
    expect(isInterruption(err)).toBe(true);
    // A decline is not an interruption, and vice-versa — they exit differently.
    expect(
      isInterruption(
        new TaskExecutionError({
          code: "GENERATOR_CANCELLED",
          message: "Cancelled.",
        }),
      ),
    ).toBe(false);
    expect(isInterruption(new Error("boom"))).toBe(false);
    expect(isInterruption(null)).toBe(false);
  });

  it("maps absent/invalid answer codes to a usage error (INVALID_INPUT)", () => {
    for (const code of [
      "MISSING_REQUIRED_ANSWER",
      "GENERATOR_INVALID_ANSWER",
    ]) {
      const mapped = asPragmaError(
        new TaskExecutionError({ code, message: "bad answer" }),
      );
      expect(mapped).toBeInstanceOf(PragmaError);
      expect(mapped.code).toBe("INVALID_INPUT");
      expect(mapped.message).toBe("bad answer");
    }
  });

  it("passes a PragmaError through unchanged", () => {
    const original = PragmaError.notFound("thing", "x");
    expect(asPragmaError(original)).toBe(original);
  });

  it("keeps an unknown failure as an internal error (with a report hint)", () => {
    const mapped = asPragmaError(new Error("kaboom"));
    expect(mapped.code).toBe("INTERNAL_ERROR");
    expect(mapped.message).toContain("kaboom");
    // Genuine bugs still say "report this issue"; a cancel never reaches here.
    expect(mapped.recovery?.message).toMatch(/report this issue/i);
  });
});
