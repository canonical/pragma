import { describe, expect, it } from "vitest";
import { parseRecovery } from "./parseRecovery.js";

describe("parseRecovery", () => {
  it("parses backtick-wrapped command", () => {
    const result = parseRecovery(
      "Run `pragma component list` to see available components.",
    );
    expect(result).toEqual({
      tool: "component_list",
      params: {},
      description: "to see available components.",
    });
  });

  it("parses plain command string", () => {
    const result = parseRecovery("pragma modifier list");
    expect(result).toEqual({
      tool: "modifier_list",
      params: {},
      description: "Run pragma modifier list",
    });
  });

  it("parses --all-tiers flag into params", () => {
    const result = parseRecovery(
      "Run `pragma component list --all-tiers` to search all tiers.",
    );
    expect(result).toEqual({
      tool: "component_list",
      params: { allTiers: true },
      description: "to search all tiers.",
    });
  });

  it("parses --detailed flag into params", () => {
    const result = parseRecovery("pragma standard get --detailed");
    expect(result?.params).toEqual({ detailed: true });
  });

  it("returns undefined for unparseable string", () => {
    expect(parseRecovery("Please report this issue.")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseRecovery("")).toBeUndefined();
  });

  it("falls back to generic description when backtick text is empty after stripping", () => {
    const result = parseRecovery("Run `pragma token list`");
    expect(result?.description).toBe("List available tokens");
  });
});
