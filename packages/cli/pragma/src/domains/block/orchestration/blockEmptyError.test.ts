import { describe, expect, it } from "vitest";
import type { FilterConfig } from "../../shared/types/index.js";
import blockEmptyError from "./blockEmptyError.js";

const filters: FilterConfig = { tier: "Apps/WPE", channel: "normal" };

describe("blockEmptyError", () => {
  it("filter-narrowing: a tier was active → widen to all tiers", () => {
    const err = blockEmptyError(filters, false);

    expect(err.filters).toEqual({ tier: "Apps/WPE", channel: "normal" });
    expect(err.recovery).toEqual({
      message: "Widen the search to show all tiers.",
      cli: "pragma block list --all-tiers",
      mcp: { tool: "block_list", params: { allTiers: true } },
    });
  });

  it("honest terminal: already at all-tiers → no recovery (no self-loop)", () => {
    const err = blockEmptyError({ tier: undefined, channel: "normal" }, true);

    // The widest tier query already returned empty; suggesting --all-tiers
    // again would loop. recovery: undefined is the correct terminal state.
    expect(err.recovery).toBeUndefined();
  });
});
