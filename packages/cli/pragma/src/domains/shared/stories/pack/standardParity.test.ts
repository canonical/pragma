/**
 * Standard-noun parity pilot — the built-in `standard` read stories vs the
 * declarative pack definition in `standardParityFixtures.ts`.
 *
 * This file wires the built-in `standard` noun into the reusable
 * {@link packParity} harness: both paths run against the real
 * @canonical/code-standards graphs, resolved from node_modules through the
 * production loader chain, and every consumer-facing surface is asserted
 * byte-identical unless the v0 pack format cannot reach it — in which case
 * the divergence is pinned in an allowlist drawn from {@link PARITY_GAPS}.
 * Nothing is cut over: the built-in stories stay untouched and the pack is
 * compiled directly.
 */

import { describe, expect, it } from "vitest";
import { PARITY_GAPS, STANDARD_PACK_STORY } from "#testing";
import { packParity } from "../../../../testing/packParity.js";
import { parsePackageEntry } from "../../../refs/operations/parseRef.js";
import {
  standardListStory,
  standardLookupStory,
} from "../../../standard/stories.js";
import { bootStore } from "../../bootStore.js";
import { PREFIX_MAP } from "../../prefixes.js";
import type { PragmaRuntime } from "../../types/index.js";

const PACK_SOURCE = "standardParityFixtures";

/**
 * Fetch the full gap-ledger entry beginning with `prefix`, so every
 * allowlist reason is a verbatim member of {@link PARITY_GAPS} (the
 * harness's `knownDivergences` check then enforces the linkage).
 */
function gap(prefix: string): string {
  const entry = PARITY_GAPS.find((candidate) => candidate.startsWith(prefix));
  if (entry === undefined) {
    throw new Error(`no PARITY_GAP begins with "${prefix}"`);
  }
  return entry;
}

/** A real standard with cs:extends — pins the JSON data-compaction gap. */
const EXTENDS_LOOKUP_NAME = "react/component/structure/context";

packParity({
  noun: "standard",
  definition: STANDARD_PACK_STORY,
  source: PACK_SOURCE,
  prefixes: { ...PREFIX_MAP },
  knownDivergences: PARITY_GAPS,
  bootRuntime: async () => {
    const boot = await bootStore({
      refs: [parsePackageEntry("@canonical/code-standards")],
    });
    return {
      rt: { store: boot.store } as PragmaRuntime,
      dispose: () => boot.store.dispose(),
    };
  },
  list: {
    story: standardListStory,
    expectedDivergences: {
      plain: gap("list plain template"),
      llm: gap("list llm template"),
      // Condensed MCP text is the llm formatter wrapped — same gap.
      condensed: gap("list llm template"),
      // json + envelope are byte-identical (summary rows match exactly).
    },
  },
  lookup: {
    story: standardLookupStory,
    names: [
      // Standards without cs:extends — lookup json is byte-identical.
      { name: "code/function/purity" },
      { name: "react/component/props" },
      // With cs:extends — the built-in compacts extends in resolved data
      // while the pack keeps the raw IRI, so lookup json diverges.
      {
        name: EXTENDS_LOOKUP_NAME,
        expectedDivergences: { json: gap("lookup data compaction") },
      },
    ],
    nearMiss: "code/function/puriti",
    expectedDivergences: {
      // The built-in renders a leading `URI:` field the pack cannot declare.
      plain: gap("lookup uri field"),
      llm: gap("lookup uri field"),
      // MCP defaults lookup to detailed (full dos/donts entity); the pack
      // has one fixed summary shape, so envelope + condensed diverge.
      envelope: gap("lookup detailed toggle"),
      condensed: gap("lookup detailed toggle"),
      // json is byte-identical except for the cs:extends case above.
    },
    // not-found errors are identical incl. ranked suggestions.
  },
});

describe("standard parity-gap ledger", () => {
  it("records every known gap as a distinct, non-empty capability entry", () => {
    expect(PARITY_GAPS.length).toBeGreaterThan(0);
    expect(new Set(PARITY_GAPS).size).toBe(PARITY_GAPS.length);
    for (const entry of PARITY_GAPS) {
      expect(entry.trim().length).toBeGreaterThan(0);
    }
  });
});
