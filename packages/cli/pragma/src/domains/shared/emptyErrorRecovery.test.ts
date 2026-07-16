import { describe, expect, it } from "vitest";
import type { PragmaError } from "#error";
import blockSpecs from "../block/mcp/specs.js";
import blockEmptyError from "../block/orchestration/blockEmptyError.js";
import modifierSpecs from "../modifier/mcp/specs.js";
import modifierEmptyError from "../modifier/orchestration/modifierEmptyError.js";
import tokenSpecs from "../token/mcp/specs.js";
import tokenEmptyError from "../token/orchestration/tokenEmptyError.js";
import type { FilterConfig } from "./types/index.js";

const filters: FilterConfig = { tier: "Apps/WPE", channel: "normal" };
const allTiers: FilterConfig = { tier: undefined, channel: "normal" };

/**
 * Every distinct empty-result scenario each domain can produce, paired with the
 * set of MCP tool names that domain actually registers. The invariant below
 * holds the four hints to the S-grade contract so authored consistency cannot
 * silently re-drift.
 */
const cases: ReadonlyArray<{
  domain: string;
  error: PragmaError;
  toolNames: ReadonlySet<string>;
  // store-empty (packages absent) → the install rung, which must NOT carry an
  // mcp retry (re-listing an absent store loops). filter-narrowing → may carry
  // a list-retry mcp pointer.
  storeEmpty: boolean;
}> = [
  {
    domain: "block (filter active)",
    error: blockEmptyError(filters, false),
    toolNames: new Set(blockSpecs.map((s) => s.name)),
    storeEmpty: false,
  },
  {
    domain: "block (all tiers — terminal)",
    error: blockEmptyError(allTiers, true),
    toolNames: new Set(blockSpecs.map((s) => s.name)),
    storeEmpty: false,
  },
  {
    domain: "token (category active)",
    error: tokenEmptyError("color"),
    toolNames: new Set(tokenSpecs.map((s) => s.name)),
    storeEmpty: false,
  },
  {
    domain: "token (store-empty)",
    error: tokenEmptyError(),
    toolNames: new Set(tokenSpecs.map((s) => s.name)),
    storeEmpty: true,
  },
  {
    domain: "modifier (store-empty)",
    error: modifierEmptyError(),
    toolNames: new Set(modifierSpecs.map((s) => s.name)),
    storeEmpty: true,
  },
  // `standard` left this contract with its domain: the bundled pack has no
  // emptyError hook (a pinned PARITY_GAP), so an empty standard list renders
  // zero rows instead of an EMPTY_RESULTS recovery.
];

describe("empty-error recovery contract (cross-domain)", () => {
  it.each(cases)("$domain honours the S-grade recovery shape", ({
    error,
    toolNames,
    storeEmpty,
  }) => {
    const recovery = error.recovery;

    // Terminal state (e.g. block already at all-tiers) is allowed.
    if (recovery === undefined) return;

    // Every hint carries a human-readable message.
    expect(recovery.message).toBeTruthy();

    // No hint is message-only: a runnable cli is always present (either a
    // pragma re-list for filter-narrowing, or a bun add for store-empty).
    expect(recovery.cli).toBeTruthy();

    if (storeEmpty) {
      // Store-empty must NOT carry an mcp retry: re-listing an absent store
      // just loops. This is the anti-drift guard for the install rung.
      expect(recovery.mcp).toBeUndefined();
    } else if (recovery.mcp !== undefined) {
      // A filter-narrowing mcp pointer must name a tool the domain actually
      // registers — catches renamed/dangling tool references.
      expect(toolNames.has(recovery.mcp.tool)).toBe(true);
    }
  });

  it("never points an install hint at @canonical/ds-global (not a real default)", () => {
    for (const { error } of cases) {
      expect(error.recovery?.cli ?? "").not.toContain("ds-global");
    }
  });
});
