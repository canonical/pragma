import { describe, expect, it } from "vitest";
import buildRecovery from "./buildRecovery.js";

describe("buildRecovery", () => {
  it("returns undefined for undefined input", () => {
    expect(buildRecovery(undefined)).toBeUndefined();
  });

  it("parses a single recovery string", () => {
    const result = buildRecovery(
      "Run `pragma token list` to see available tokens.",
    );
    expect(result?.tool).toBe("token_list");
  });

  it("returns first parseable entry from array", () => {
    const result = buildRecovery([
      "Run `pragma component list --all-tiers` to search all tiers.",
      "Run `pragma config show` to see filter settings.",
    ]);
    expect(result?.tool).toBe("component_list");
    expect(result?.params).toEqual({ allTiers: true });
  });

  it("skips unparseable entries in array", () => {
    const result = buildRecovery([
      "Please report this issue.",
      "Run `pragma standard list` to see available standards.",
    ]);
    expect(result?.tool).toBe("standard_list");
  });

  it("returns undefined when all entries are unparseable", () => {
    const result = buildRecovery([
      "Please report this issue.",
      "Contact support.",
    ]);
    expect(result).toBeUndefined();
  });
});
