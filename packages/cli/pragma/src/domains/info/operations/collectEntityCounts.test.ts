import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import listBlocks from "../../block/operations/list.js";
import listModifiers from "../../modifier/operations/list.js";
import { TTL_PREFIXES } from "../../shared/prefixes.js";
import { standardPack } from "../../shared/stories/pack/bundled/standardPack.js";
import runSelectQuery from "../../shared/stories/pack/runSelectQuery.js";
import type { FilterConfig } from "../../shared/types/index.js";
import listTokens from "../../token/operations/list.js";
import { collectEntityCounts } from "./collectEntityCounts.js";

/**
 * The user-facing standard row count: the bundled pack's list query is
 * what `standard list` serves since the standard cutover, so the info
 * count must stay in lockstep with it (same WHERE grain the retired
 * listStandards op used, including the OPTIONAL fan-out).
 */
async function countStandardRows(store: Store): Promise<number> {
  const rows = await runSelectQuery(store, standardPack.list.query, "test");
  return rows.length;
}

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

// The block count is the only filtered count, so its parity must hold under
// every tier/channel combination the list op supports.
const configs: Record<string, FilterConfig> = {
  "no tier, prerelease": { tier: undefined, channel: "prerelease" },
  "no tier, normal": { tier: undefined, channel: "normal" },
  "global tier": { tier: "global", channel: "prerelease" },
  "apps/lxd tier": { tier: "apps/lxd", channel: "normal" },
};

describe("collectEntityCounts", () => {
  it.each(
    Object.entries(configs),
  )("matches legacy list-op lengths for %s", async (_label, config) => {
    const counts = await collectEntityCounts(store, config);

    expect(counts.blocks).toBe((await listBlocks(store, config)).length);
    expect(counts.standards).toBe(await countStandardRows(store));
    expect(counts.modifierFamilies).toBe((await listModifiers(store)).length);
    expect(counts.tokens).toBe((await listTokens(store)).length);
  });

  it("returns positive counts on the full fixture", async () => {
    const counts = await collectEntityCounts(store, {
      tier: undefined,
      channel: "prerelease",
    });

    expect(counts.blocks).toBeGreaterThan(0);
    expect(counts.standards).toBeGreaterThan(0);
    expect(counts.modifierFamilies).toBeGreaterThan(0);
    expect(counts.tokens).toBeGreaterThan(0);
  });
});

// A dedicated fan-out store (kept separate from the shared dsFixtures so its
// enriched cardinality does not ripple into other suites). Every entity fans
// its list op to MORE rows than there are distinct subjects, which is exactly
// where a single-variable `COUNT(DISTINCT ?subject)` would undercount — so
// these fixtures pin the grain-faithful subquery counts (FIX 4).
const FAN_OUT_TTL = `
${TTL_PREFIXES}

# One block asserted as TWO types -> two GROUP BY (?component ?type ?name ?tier)
# groups, so listBlocks emits two rows for a single subject.
ds:fanout.multitype a ds:Component, ds:Pattern ;
  ds:name "MultiType" ;
  ds:tier ds:global ;
  ds:release ds:stable .

# A beta-only single-type block -> present under prerelease, filtered under
# normal, so the block count also tracks channel scoping.
ds:fanout.solo a ds:Component ;
  ds:name "Solo" ;
  ds:tier ds:global ;
  ds:release ds:beta .

# One modifier family with TWO names -> two GROUP BY (?family ?name) groups.
ds:fanout.family a ds:ModifierFamily ;
  ds:name "Alpha", "Beta" .

# One standard in TWO categories -> the OPTIONAL hasCategory fans two rows.
cs:fanout_cat_a a cs:Category ; cs:slug "cat-a" .
cs:fanout_cat_b a cs:Category ; cs:slug "cat-b" .
cs:fanout_std a cs:CodeStandard ;
  cs:name "fanout/standard" ;
  cs:description "A standard in two categories." ;
  cs:hasCategory cs:fanout_cat_a, cs:fanout_cat_b .

# One token with TWO token types -> the OPTIONAL tokenType fans two rows.
ds:fanout_tt_a a ds:TokenType ; rdfs:label "TypeA" .
ds:fanout_tt_b a ds:TokenType ; rdfs:label "TypeB" .
ds:fanout.token a ds:Token ;
  ds:tokenId "fanout.token" ;
  ds:tokenType ds:fanout_tt_a, ds:fanout_tt_b .
`;

describe("collectEntityCounts fan-out parity", () => {
  let fanStore: Store;
  let fanCleanup: () => void;

  beforeAll(async () => {
    const result = await createTestStore({ ttl: FAN_OUT_TTL });
    fanStore = result.store;
    fanCleanup = result.cleanup;
  });

  afterAll(() => fanCleanup());

  const fanConfigs: Record<string, FilterConfig> = {
    prerelease: { tier: undefined, channel: "prerelease" },
    normal: { tier: undefined, channel: "normal" },
  };

  it.each(
    Object.entries(fanConfigs),
  )("each count equals its legacy list-op length under %s channel", async (_label, config) => {
    const counts = await collectEntityCounts(fanStore, config);

    expect(counts.blocks).toBe((await listBlocks(fanStore, config)).length);
    expect(counts.standards).toBe(await countStandardRows(fanStore));
    expect(counts.modifierFamilies).toBe(
      (await listModifiers(fanStore)).length,
    );
    expect(counts.tokens).toBe((await listTokens(fanStore)).length);
  });

  it("actually fans each entity beyond its distinct-subject count", async () => {
    // These are the cardinalities a naive `COUNT(DISTINCT ?subject)` would
    // undercount (blocks 3 vs 2 subjects, families 2 vs 1, etc.).
    const config: FilterConfig = { tier: undefined, channel: "prerelease" };
    expect((await listBlocks(fanStore, config)).length).toBe(3);
    expect((await listModifiers(fanStore)).length).toBe(2);
    expect(await countStandardRows(fanStore)).toBe(2);
    expect((await listTokens(fanStore)).length).toBe(2);

    // And under normal channel the beta block drops out (2 block rows).
    expect(
      (await listBlocks(fanStore, { tier: undefined, channel: "normal" }))
        .length,
    ).toBe(2);
  });
});
