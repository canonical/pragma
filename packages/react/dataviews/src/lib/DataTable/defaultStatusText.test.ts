import { describe, expect, it } from "vitest";
import defaultStatusText from "./defaultStatusText.js";

describe("defaultStatusText", () => {
  it("gives each no-rows outcome its own words", () => {
    expect(defaultStatusText({ kind: "loading" })).toBe("Loading…");
    expect(defaultStatusText({ kind: "error", reason: "offline" })).toBe(
      "offline",
    );
    expect(defaultStatusText({ kind: "no-results" })).toBe(
      "No rows match this query.",
    );
    expect(defaultStatusText({ kind: "no-data" })).toBe(
      "There is nothing here yet.",
    );
  });
});
