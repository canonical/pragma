/**
 * B9 — the `block list` CLI journey, re-pinned on the DECLARED contract.
 *
 * BACKING ADAPTATION: the plan lists this as "fixture + spawn"; the PR4 quality
 * bar (R7 — keep the spawn-e2e layer to exactly A1-A4/A7) overrides that, so
 * this drives `block list` through the REAL CLI dispatch path (`executeVerb`,
 * the same function the shipped entry's `dispatch()` calls) IN-PROCESS
 * against the fixture, rather than spawning. It still exercises the true CLI
 * seam (typed params -> dispatch -> render), just without forking a process.
 *
 * CONTRACT CHANGE, TWICE, and this journey is where both are legible. It used
 * to enumerate four answers — one per tier config, one per channel, one for
 * `--all-tiers` — from hand-written filtering. That went, and the journey then
 * pinned ONE answer under every config, because neither `config.tier` nor
 * `config.channel` reached the query at all.
 *
 * The TIER SCOPE brings back exactly one of those two, in declared form: the
 * `block` story declares the tier hierarchy, so `config.tier` and a per-call
 * `--tier` decide which tiers the list answers from — unset is the top-level
 * tiers, a tier is its own chain, `all` is the unfiltered list this journey used
 * to pin. `config.channel` still reaches nothing, and the owner-signed
 * consequence of that — experimental/alpha blocks are visible to everyone — is
 * still asserted here rather than left to prose.
 *
 * So there are several answers again, and that is the improvement: each one
 * states the scope it used, and one argument widens it.
 *
 * BOTH HALVES OF THE NOUN AGREE, as they have to: `block lookup` reads the same
 * declared hierarchy, so the tier that decides which blocks this list shows is
 * the tier that decides which Button a bare name means. The lookup's own half
 * of that — it PREFERS the scope and falls back rather than refusing — is
 * asserted in `kernel/packs/tierScope.test.ts` and, on the shipped pack's real
 * tiers, in `capabilities/block.tierRank.exec.test.ts`.
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

/**
 * What the DEFAULT tier scope answers with: the top-level tiers (`global` and
 * `apps`), so `LXD Panel` — two levels down, in `apps/lxd` — is out.
 *
 * `Button Icon` is IN, and that is the half worth stating twice: it carries no
 * tier, and an entity the scope cannot PLACE is not an entity the scope hides.
 * The hand-written verb's required tier join is what used to hide it.
 */
const TOP_LEVEL_BLOCKS = ["Beta Widget", "Button", "Button Icon", "Modal"];

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

async function blockListNames(
  fixture: FixtureGraph,
  params: Record<string, unknown> = {},
): Promise<string[]> {
  const out = await executeVerb(
    listVerb,
    params,
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, fixture.cwd),
  );
  const rows = JSON.parse(out.stdout as string).data as { name: string }[];
  return rows.map((r) => r.name).sort();
}

describe("block list — the declared, tier-scoped list (B9, in-process CLI dispatch)", () => {
  it("with no tier configured, answers from the top-level tiers", async () => {
    expect(await blockListNames(await bootWith(CANONICAL_CONFIG))).toEqual(
      TOP_LEVEL_BLOCKS,
    );
  });

  it("a configured tier narrows the list to its own chain", async () => {
    // `global` is the base and has nothing above it, so its chain is itself.
    // The apps/lxd block is out — and the UNTIERED subcomponent is not.
    const fixture = await bootWith({ tier: "global", channel: "normal" });
    expect(await blockListNames(fixture)).toEqual(TOP_LEVEL_BLOCKS);
  });

  it("the deepest tier in the chain sees MORE than the shallowest", async () => {
    // Tier-chain inheritance was the point of the hand-written query, and it is
    // the point again: `apps/lxd` -> [global, apps, apps/lxd], so the deepest
    // tier answers with its own block AND everything it inherits. That is why
    // the scope is the chain and not the single tier.
    const names = await blockListNames(await bootWith(FILTERED_CONFIG));
    expect(names).toEqual(EVERY_BLOCK);
    expect(names).toContain("LXD Panel");
  });

  it("every tier on request is the unfiltered list this journey used to pin", async () => {
    // The escape, and the proof that the scope removes nothing from the store:
    // one argument, and every tier answers again.
    const fixture = await bootWith(CANONICAL_CONFIG);
    expect(await blockListNames(fixture, { tier: "all" })).toEqual(EVERY_BLOCK);
  });

  it("a per-call tier replaces the configured one", async () => {
    // Precedence, at the seam a reader meets it: the machine is set to the deep
    // tier, the call asks for the base, and the call wins.
    const fixture = await bootWith(FILTERED_CONFIG);
    expect(await blockListNames(fixture, { tier: "global" })).toEqual(
      TOP_LEVEL_BLOCKS,
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
    // Both configs set no tier, so both answer from the top-level tiers: the
    // channel changes nothing, which is the claim. What narrows these rows is
    // the tier scope, and it narrows them identically.
    expect(await blockListNames(await bootWith(ALL_VISIBLE_CONFIG))).toEqual(
      TOP_LEVEL_BLOCKS,
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
