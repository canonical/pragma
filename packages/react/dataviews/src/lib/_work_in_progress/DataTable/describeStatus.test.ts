import { describe, expect, it } from "vitest";
import describeStatus from "./describeStatus.js";

describe("describeStatus", () => {
  it("gives each status its own words", () => {
    expect(describeStatus({ status: "loading" })).toBe("Loading…");
    expect(describeStatus({ status: "failed", reason: "offline" })).toBe(
      "These rows could not be loaded: offline",
    );
    // A failed refresh keeps its rows, so the words say what could not be
    // done rather than what is missing.
    expect(
      describeStatus({ status: "refresh-failed", reason: "offline" }),
    ).toBe("These rows could not be refreshed: offline");
    expect(describeStatus({ status: "stale", reason: "offline" })).toBe(
      "These rows do not match the current query: offline",
    );
    expect(describeStatus({ status: "no-results" })).toBe(
      "No rows match this query.",
    );
    expect(describeStatus({ status: "no-data" })).toBe(
      "There is nothing here yet.",
    );
  });
});
