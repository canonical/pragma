import { describe, expect, it } from "vitest";
import standardEmptyError from "./standardEmptyError.js";

describe("standardEmptyError", () => {
  it("filter-narrowing: a category/search was active → clear filters and re-list", () => {
    const err = standardEmptyError({ category: "react", search: "fold" });

    expect(err.filters).toEqual({ category: "react", search: "fold" });
    expect(err.recovery).toEqual({
      message: "List all standards without filters.",
      cli: "pragma standard list",
      mcp: { tool: "standard_list" },
    });
  });

  it("store-empty: no filter active → install, not a self-looping list", () => {
    const err = standardEmptyError({});

    expect(err.filters).toBeUndefined();
    // Must NOT suggest `pragma standard list` again — that just re-returns empty.
    expect(err.recovery).toEqual({
      message: "Install the code standards packages that provide standards.",
      cli: "bun add -D @canonical/code-standards",
    });
    expect(err.recovery?.mcp).toBeUndefined();
  });

  it("install branch cites the code-standards package", () => {
    const err = standardEmptyError({});
    expect(err.recovery?.cli).toContain("@canonical/code-standards");
    expect(err.recovery?.cli).not.toContain("ds-global");
  });
});
