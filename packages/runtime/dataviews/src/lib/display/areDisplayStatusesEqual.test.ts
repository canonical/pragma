import { describe, expect, it } from "vitest";
import areDisplayStatusesEqual from "./areDisplayStatusesEqual.js";

describe("areDisplayStatusesEqual", () => {
  it("holds two statuses alike when they say the same thing", () => {
    expect(areDisplayStatusesEqual(null, null)).toBe(true);
    expect(
      areDisplayStatusesEqual({ status: "pending" }, { status: "pending" }),
    ).toBe(true);
    expect(
      areDisplayStatusesEqual(
        { status: "stale", reason: "unreachable" },
        { status: "stale", reason: "unreachable" },
      ),
    ).toBe(true);
  });

  it("tells apart a different status, a different reason and no status", () => {
    expect(
      areDisplayStatusesEqual({ status: "pending" }, { status: "no-data" }),
    ).toBe(false);
    expect(
      areDisplayStatusesEqual(
        { status: "failed", reason: "unreachable" },
        { status: "failed", reason: "timed out" },
      ),
    ).toBe(false);
    expect(
      areDisplayStatusesEqual(
        { status: "stale", reason: "offline" },
        { status: "refresh-failed", reason: "offline" },
      ),
    ).toBe(false);
    expect(areDisplayStatusesEqual({ status: "pending" }, null)).toBe(false);
    expect(areDisplayStatusesEqual(null, { status: "pending" })).toBe(false);
  });
});
