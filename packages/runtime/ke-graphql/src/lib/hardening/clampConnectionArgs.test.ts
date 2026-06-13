import { describe, expect, it } from "vitest";
import clampConnectionArgs from "./clampConnectionArgs.js";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants.js";

describe("clampConnectionArgs (page-size hardening)", () => {
  it("imposes the default page size when neither first nor last is given", () => {
    expect(clampConnectionArgs({})).toEqual({ first: DEFAULT_PAGE_SIZE });
    // `after`/`before` alone still count as "no page bound supplied".
    expect(clampConnectionArgs({ after: "cur" })).toEqual({
      after: "cur",
      first: DEFAULT_PAGE_SIZE,
    });
  });

  it("caps an over-large first/last at the ceiling", () => {
    expect(clampConnectionArgs({ first: 10_000 }).first).toBe(MAX_PAGE_SIZE);
    expect(clampConnectionArgs({ last: 10_000 }).last).toBe(MAX_PAGE_SIZE);
  });

  it("leaves in-range values untouched", () => {
    expect(clampConnectionArgs({ first: 10 }).first).toBe(10);
    expect(clampConnectionArgs({ last: 5 })).toEqual({ last: 5 });
  });

  it("passes negatives through unchanged (rejected downstream, not masked)", () => {
    expect(clampConnectionArgs({ first: -1 }).first).toBe(-1);
    expect(clampConnectionArgs({ last: -3 }).last).toBe(-3);
  });

  it("honors explicit limits", () => {
    const limits = { defaultPageSize: 3, maxPageSize: 9 };
    expect(clampConnectionArgs({}, limits)).toEqual({ first: 3 });
    expect(clampConnectionArgs({ first: 100 }, limits).first).toBe(9);
  });
});
