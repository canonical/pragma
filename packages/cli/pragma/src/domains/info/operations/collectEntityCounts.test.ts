import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import listBlocks from "../../block/operations/list.js";
import listModifiers from "../../modifier/operations/list.js";
import type { FilterConfig } from "../../shared/types/index.js";
import listStandards from "../../standard/operations/list.js";
import listTokens from "../../token/operations/list.js";
import { collectEntityCounts } from "./collectEntityCounts.js";

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
    expect(counts.standards).toBe((await listStandards(store)).length);
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
