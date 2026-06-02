import { describe, expect, it } from "vitest";
import modifierEmptyError from "./modifierEmptyError.js";

describe("modifierEmptyError", () => {
  it("recovers via a runnable install command (store-empty is its only scenario)", () => {
    const err = modifierEmptyError();

    // `modifier list` takes no filters, so an empty result is always
    // store-empty: the recovery is the install, not a widen.
    expect(err.recovery).toEqual({
      message: "Install the design system packages that provide modifiers.",
      cli: "bun add -D @canonical/design-system",
    });
  });

  it("cites a real default package, not @canonical/ds-global", () => {
    const err = modifierEmptyError();
    expect(err.recovery?.cli).toContain("@canonical/design-system");
    expect(err.recovery?.cli).not.toContain("ds-global");
  });

  it("has no mcp retry for store-empty (re-listing would return empty again)", () => {
    const err = modifierEmptyError();
    expect(err.recovery?.mcp).toBeUndefined();
  });
});
