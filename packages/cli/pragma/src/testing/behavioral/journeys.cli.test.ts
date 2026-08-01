/**
 * B9 — the `block list` CLI journey, re-pinned on the DECLARED contract.
 *
 * BACKING ADAPTATION: the plan lists this as "fixture + spawn"; the PR4 quality
 * bar (R7 — keep the spawn-e2e layer to exactly A1-A4/A7) overrides that, so
 * this drives `block list` through the REAL CLI dispatch path (`executeVerb`,
 * the same function the compiled binary's `dispatch()` calls) IN-PROCESS
 * against the fixture, rather than spawning. It still exercises the true CLI
 * seam (typed params -> dispatch -> render), just without forking a process.
 *
 * CONTRACT CHANGE (L-OPEN-9): this journey used to enumerate four different
 * answers — one per tier config, one per channel, one for `--all-tiers`. That
 * hand-written filtering is gone; `block list` is the block story's compiled,
 * UNFILTERED list. So the journey pins the honest NEW behaviour, which is a
 * STRONGER claim than the old one: the SAME graph under FOUR different configs
 * gives ONE answer, containing every block in the store. `config.tier` and
 * `config.channel` no longer reach the query at all, and the owner-signed
 * consequence — experimental/alpha blocks are visible to everyone — is asserted
 * here rather than left to prose.
 *
 * CONTENT ADAPTATION (R2 — verified against the live `block lookup`, not
 * assumed): the plan's wording describes an unscoped `block lookup` returning
 * multiple tier-disambiguated matches — that mechanism doesn't exist in v2
 * (`block lookup` resolves by name GLOBALLY with no tier awareness at all;
 * PARITY_GAPS `block-lookup-not-tier-scoped`). Since L-OPEN-9 neither block
 * verb is tier-aware, so both halves of the noun now agree.
 */

import { afterAll, describe, expect, it } from "vitest";
import { storyModules } from "../../capabilities/distribution.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_CONFIG,
  CANONICAL_TTL,
  FILTERED_CONFIG,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
  type FixtureGraphOptions,
} from "../helpers/fixtureGraph.js";
import { JSON_FLAGS, NO_MUTATION } from "../helpers/parity.js";

const blockModule = storyModules.get("block");
if (!blockModule) {
  throw new Error('pragma.conf.ts declares no story for "block"');
}

const listVerb = blockModule.verbs.find(
  (v) => verbKey(v.path) === "block list",
) as VerbSpec;

/**
 * Every block the canonical fixture carries: two global components, one scoped
 * to `apps/lxd`, one gated to the `beta` release channel, and one UNTIERED
 * subcomponent. Under the hand-written verb NO single invocation returned all
 * five — the tier chain hid `LXD Panel`, the channel hid `Beta Widget`, and only
 * `--all-tiers` revealed `Button Icon`. The declared list returns all five, and
 * returns them whatever the config says.
 */
const EVERY_BLOCK = [
  "Beta Widget",
  "Button",
  "Button Icon",
  "LXD Panel",
  "Modal",
];

const fixtures: FixtureGraph[] = [];
afterAll(async () => {
  await Promise.all(fixtures.map((f) => f.dispose()));
});

/** Boot a tracked canonical fixture under `config`, for auto-disposal. */
async function bootWith(
  config: FixtureGraphOptions["config"],
): Promise<FixtureGraph> {
  const fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL, config });
  fixtures.push(fixture);
  return fixture;
}

async function blockListNames(fixture: FixtureGraph): Promise<string[]> {
  const out = await executeVerb(
    listVerb,
    {},
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, fixture.cwd),
  );
  const rows = JSON.parse(out.stdout as string).data as { name: string }[];
  return rows.map((r) => r.name).sort();
}

describe("block list — the declared, unfiltered list (B9, in-process CLI dispatch)", () => {
  it("with no tier configured, lists every block in the store", async () => {
    expect(await blockListNames(await bootWith(CANONICAL_CONFIG))).toEqual(
      EVERY_BLOCK,
    );
  });

  it("a configured tier does NOT narrow the list — tier scopes nothing", async () => {
    // The old verb answered ["Button", "Modal"] here: `global` excluded the
    // apps/lxd block, and the required `ds:tier` join hid the untiered
    // subcomponent. Nothing filters now, so the tier config is inert.
    const fixture = await bootWith({ tier: "global", channel: "normal" });
    expect(await blockListNames(fixture)).toEqual(EVERY_BLOCK);
  });

  it("the deepest tier in the chain gets the same answer as the shallowest", async () => {
    // Tier-chain inheritance was the point of the hand-written query
    // (`apps/lxd` -> [global, apps, apps/lxd]). With no filtering there is no
    // chain to walk, so `apps/lxd` and `global` are indistinguishable.
    expect(await blockListNames(await bootWith(FILTERED_CONFIG))).toEqual(
      EVERY_BLOCK,
    );
  });
});

describe("block list — channel visibility is gone too (B9)", () => {
  it("the `normal` channel shows the beta-gated block — the signed-off consequence", async () => {
    // `ds:betaWidget` carries `ds:release ds:beta`. The hand-written verb hid it
    // from every channel but `prerelease`; the declared list shows it to
    // everyone. This is the owner-signed visible consequence of L-OPEN-9,
    // pinned so it stays a decision on record rather than a silent regression.
    const names = await blockListNames(await bootWith(CANONICAL_CONFIG));
    expect(names).toContain("Beta Widget");
  });

  it("`prerelease` — once the only config that saw everything — is now unremarkable", async () => {
    expect(await blockListNames(await bootWith(ALL_VISIBLE_CONFIG))).toEqual(
      EVERY_BLOCK,
    );
  });
});

describe("block list — the row shape the declared columns emit (B9)", () => {
  it("derives name/type/tier in SPARQL, and leaves an untiered block's tier unset", async () => {
    const fixture = await bootWith(CANONICAL_CONFIG);
    const out = await executeVerb(
      listVerb,
      {},
      NO_MUTATION,
      bootRuntime(JSON_FLAGS, fixture.cwd),
    );
    const rows = JSON.parse(out.stdout as string).data as {
      name: string;
      type?: string;
      tier?: string;
      uri: string;
      modifiers?: string;
    }[];
    const byName = new Map(rows.map((row) => [row.name, row]));

    // `type` is the LOWERCASED local name of the matched class — the BIND that
    // replaced the hand-written `normalizeType`.
    expect(byName.get("Button")?.type).toBe("component");
    expect(byName.get("Button Icon")?.type).toBe("subcomponent");
    // `tier` is the tier IRI's local name; an untiered block simply has none.
    expect(byName.get("Button")?.tier).toBe("global");
    expect(byName.get("Button Icon")?.tier).toBeUndefined();
    expect(byName.get("Button")?.uri).toBe("https://ds.canonical.com/button");
    // GROUP_CONCAT of the modifier family names (order-independent).
    expect(byName.get("Button")?.modifiers?.split(", ").sort()).toEqual([
      "density",
      "importance",
    ]);
  });
});
