import { describe, expect, it } from "vitest";
import { type TierLookupData, tierLookupFormatters } from "./lookup.render.js";

const TIER: TierLookupData = {
  uri: "cs:apps/lxd-panel",
  name: "apps/lxd-panel",
  blocks: ["LXD Panel", "Status Bar"],
};

describe("tierLookupFormatters", () => {
  it("underlines the plain title with an ═ rule (B7)", () => {
    const [title, rule, blank, blocks] = tierLookupFormatters
      .plain(TIER)
      .split("\n");
    expect(title).toBe("apps/lxd-panel (cs:apps/lxd-panel)");
    expect(rule).toBe("═".repeat(Math.max((title as string).length, 24)));
    expect(blank).toBe("");
    expect(blocks).toBe("  blocks: LXD Panel, Status Bar");
  });

  it("floors the plain rule at 24 columns for a short title", () => {
    const out = tierLookupFormatters.plain({ ...TIER, uri: "x", name: "a" });
    expect(out.split("\n").at(1)).toBe("═".repeat(24));
  });

  it("heads the llm entity read at H2, never H1 (B2)", () => {
    const out = tierLookupFormatters.llm(TIER);
    expect(out.startsWith("## apps/lxd-panel\n")).toBe(true);
    expect(out).not.toMatch(/^# /m);
  });
});
