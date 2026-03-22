import { describe, expect, it } from "vitest";
import buildRecovery from "./buildRecovery.js";

describe("buildRecovery", () => {
  it("returns undefined for undefined input", () => {
    expect(buildRecovery(undefined)).toBeUndefined();
  });

  it("returns undefined when recovery has no mcp field", () => {
    expect(
      buildRecovery({
        message: "Please report this issue.",
      }),
    ).toBeUndefined();
  });

  it("extracts mcp recovery object", () => {
    const result = buildRecovery({
      message: "List available tokens.",
      cli: "pragma token list",
      mcp: { tool: "token_list" },
    });
    expect(result).toEqual({ tool: "token_list" });
  });

  it("extracts mcp recovery with params", () => {
    const result = buildRecovery({
      message: "Widen the search.",
      cli: "pragma block list --all-tiers",
      mcp: { tool: "block_list", params: { allTiers: true } },
    });
    expect(result).toEqual({
      tool: "block_list",
      params: { allTiers: true },
    });
  });
});
