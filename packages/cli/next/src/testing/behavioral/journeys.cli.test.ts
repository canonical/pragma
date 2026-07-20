/**
 * B9 — the tier-chain / channel CLI journey (PR3 Risk5's ONE hand-written
 * verb, `block list`).
 *
 * BACKING ADAPTATION: the plan lists this as "fixture + spawn"; the PR4 quality
 * bar (R7 — keep the spawn-e2e layer to exactly A1-A4/A7) overrides that, so
 * this drives `block list` through the REAL CLI dispatch path (`executeVerb`,
 * the same function the compiled binary's `dispatch()` calls) IN-PROCESS
 * against the fixture, rather than spawning. It still exercises the true CLI
 * seam (typed params -> dispatch -> render), just without forking a process.
 *
 * CONTENT ADAPTATION (R2 — verified against the live `block lookup`, not
 * assumed): the plan's wording describes an unscoped `block lookup` returning
 * multiple tier-disambiguated matches — that mechanism doesn't exist in v2
 * (`block lookup` resolves by name GLOBALLY with no tier awareness at all;
 * PARITY_GAPS `block-lookup-not-tier-scoped`). Only `block list` is
 * tier/channel-aware, so this journey is entirely about `block list` under
 * different tier configs on the SAME canonical graph.
 */

import { afterAll, describe, expect, it } from "vitest";
import { blockModule } from "../../capabilities/block/index.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  CANONICAL_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import { JSON_FLAGS, NO_MUTATION } from "../helpers/parity.js";

const listVerb = blockModule.verbs.find(
  (v) => verbKey(v.path) === "block list",
) as VerbSpec;

async function blockListNames(
  fixture: FixtureGraph,
  allTiers = false,
): Promise<string[]> {
  const out = await executeVerb(
    listVerb,
    { allTiers },
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, fixture.cwd),
  );
  const rows = JSON.parse(out.stdout as string).data as { name: string }[];
  return rows.map((r) => r.name).sort();
}

const fixtures: FixtureGraph[] = [];
afterAll(async () => {
  await Promise.all(fixtures.map((f) => f.dispose()));
});

describe("block list — tier-chain inheritance (B9, in-process CLI dispatch)", () => {
  it("unscoped (no tier configured) sees every tier", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: CANONICAL_CONFIG, // channel: normal, no tier set
    });
    fixtures.push(fixture);
    // normal channel drops the beta-only block; no tier set -> every tier.
    expect(await blockListNames(fixture)).toEqual([
      "Button",
      "LXD Panel",
      "Modal",
    ]);
  });

  it("scoped to the global tier excludes the apps/lxd-only block", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: { tier: "global", channel: "normal" },
    });
    fixtures.push(fixture);
    expect(await blockListNames(fixture)).toEqual(["Button", "Modal"]);
  });

  it("scoped to apps/lxd includes its OWN block plus the inherited chain", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: { tier: "apps/lxd", channel: "normal" },
    });
    fixtures.push(fixture);
    // resolveTierChain("apps/lxd") = [global, apps, apps/lxd] — Button/Modal
    // (global) are inherited; LXD Panel is the tier's own block.
    expect(await blockListNames(fixture)).toEqual([
      "Button",
      "LXD Panel",
      "Modal",
    ]);
  });

  it("--all-tiers ignores a configured tier scope", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: { tier: "global", channel: "normal" },
    });
    fixtures.push(fixture);
    // Scoped (no flag) excludes LXD Panel; --all-tiers restores it AND reveals
    // the untiered Button Icon subcomponent the scoped view omits (A2).
    expect(await blockListNames(fixture, false)).toEqual(["Button", "Modal"]);
    expect(await blockListNames(fixture, true)).toEqual([
      "Button",
      "Button Icon",
      "LXD Panel",
      "Modal",
    ]);
  });
});

describe("block list — channel visibility (B9)", () => {
  it("prerelease channel is the one config where all 4 components list", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: { channel: "prerelease" },
    });
    fixtures.push(fixture);
    expect(await blockListNames(fixture)).toEqual([
      "Beta Widget",
      "Button",
      "LXD Panel",
      "Modal",
    ]);
  });
});
