import { describe, expect, it } from "vitest";
import tokenEmptyError from "./tokenEmptyError.js";

describe("tokenEmptyError", () => {
  it("filter-narrowing: a category was active → clear it and re-list", () => {
    const err = tokenEmptyError("color");

    expect(err.filters).toEqual({ category: "color" });
    expect(err.recovery).toEqual({
      message: "List all tokens without category filter.",
      cli: "pragma token list",
      mcp: { tool: "token_list" },
    });
  });

  it("store-empty: no category active → runnable install, no mcp retry", () => {
    const err = tokenEmptyError();

    expect(err.filters).toBeUndefined();
    expect(err.recovery).toEqual({
      message: "Install the design system packages that provide tokens.",
      cli: "bun add -D @canonical/design-system",
    });
    // No mcp: re-calling token_list on an absent store returns empty again.
    expect(err.recovery?.mcp).toBeUndefined();
  });

  it("install branch cites a real default package, not @canonical/ds-global", () => {
    const err = tokenEmptyError();
    expect(err.recovery?.cli).toContain("@canonical/design-system");
    expect(err.recovery?.cli).not.toContain("ds-global");
  });
});
