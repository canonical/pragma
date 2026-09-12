import { describe, expect, it } from "vitest";
import defaultStatusText from "./defaultStatusText.js";

describe("defaultStatusText", () => {
  it("gives each status its own words", () => {
    expect(defaultStatusText({ status: "loading" })).toBe("Loading…");
    expect(defaultStatusText({ status: "failed", reason: "offline" })).toBe(
      "These rows could not be loaded: offline",
    );
    // A failed refresh keeps its rows, so the words say what could not be
    // done rather than what is missing.
    expect(
      defaultStatusText({ status: "refresh-failed", reason: "offline" }),
    ).toBe("These rows could not be refreshed: offline");
    expect(defaultStatusText({ status: "stale", reason: "offline" })).toBe(
      "These rows do not match the current query: offline",
    );
    expect(defaultStatusText({ status: "no-results" })).toBe(
      "No rows match this query.",
    );
    expect(defaultStatusText({ status: "no-data" })).toBe(
      "There is nothing here yet.",
    );
  });
});
