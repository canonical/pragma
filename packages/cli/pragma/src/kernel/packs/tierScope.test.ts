/**
 * The tier scope: which tiers a read of a tiered noun answers from.
 *
 * Over a fixture with a REAL hierarchy — two levels, a base, an untiered
 * entity, and a name two tiers share — because every interesting case in this
 * rule is a case about depth, and a flat graph can state none of them. The
 * shipped pack's own fifteen tiers are exercised in
 * `capabilities/block.tierRank.exec.test.ts`; what is held here is the RULE:
 *
 * - the default is the tiers nothing sits above;
 * - a chosen tier is that tier, its ancestors, and the declared base;
 * - `all` is no scope at all;
 * - the flag beats the config, and the config beats the default;
 * - a tier that does not exist is a refusal that names the ones that do;
 * - an UNTIERED entity is in every scope — it cannot be placed, so it cannot be
 *   placed outside (the `ds:button.icon` property `block.parity.test.ts` holds
 *   for the shipped story);
 * - a lookup PREFERS the scope and falls back rather than answering "no such
 *   thing" about a thing the store holds.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { executeVerb } from "../project/cli/dispatch.js";
import type { GlobalFlags, PragmaRuntime } from "../runtime/types.js";
import type { VerbSpec } from "../spec/types.js";
import { compilePack } from "./compile.js";
import { lookupFormatters } from "./renderPack.js";
import { GLOB_EXPANSION_CAP, type LookupOutput } from "./resolveEntity.js";
import { buildTierHierarchy, resolveTierScope } from "./tierScope.js";
import {
  distributionSource,
  type PackDefinition,
  type PackPage,
  type PackTierScope,
} from "./types.js";
import { verbKey } from "./uniqueness.js";

const PREFIXES = {
  ex: "https://example.org/kit#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/**
 * Four tiers over two levels, plus the shapes the rule has to survive: an
 * untiered part, and one name (`Chip`) carried by both a top-level tier and a
 * nested one.
 */
const TTL = `
@prefix ex: <https://example.org/kit#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Widget a owl:Class .
ex:Tier a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:tier a owl:ObjectProperty ; rdfs:domain ex:Widget ; rdfs:range ex:Tier .

ex:global a ex:Tier ; ex:name "Global" .
ex:apps a ex:Tier ; ex:name "Apps" .
ex:apps_lxd a ex:Tier ; ex:name "Apps/LXD" .
ex:sites a ex:Tier ; ex:name "Sites" .

ex:button a ex:Widget ; ex:name "Button" ; ex:tier ex:global .
ex:chip a ex:Widget ; ex:name "Chip" ; ex:tier ex:global .
ex:bar a ex:Widget ; ex:name "Bar" ; ex:tier ex:apps .
ex:banner a ex:Widget ; ex:name "Banner" ; ex:tier ex:sites .
ex:meter a ex:Widget ; ex:name "Meter" ; ex:tier ex:apps_lxd .
ex:lxd_chip a ex:Widget ; ex:name "Chip" ; ex:tier ex:apps_lxd .
ex:loose a ex:Widget ; ex:name "Loose" .
`;

const TIER_SCOPE: PackTierScope = {
  type: "ex:Tier",
  via: "ex:tier",
  by: "ex:name",
  base: "ex:global",
};

const KIT: PackDefinition = {
  noun: "widget",
  description: "List widgets.",
  tierScope: TIER_SCOPE,
  list: {
    query: [
      "SELECT ?uri ?name WHERE {",
      "  ?uri a ex:Widget ; ex:name ?name .",
      "} ORDER BY ?name STR(?uri)",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
    ],
    search: { variables: ["name"] },
  },
  lookup: { by: "ex:name", type: "ex:Widget" },
};

/** The same pack with no hierarchy declared — the unscoped control. */
const UNSCOPED: PackDefinition = { ...KIT, tierScope: undefined };

const verbFor = (pack: PackDefinition, label: string): VerbSpec =>
  compilePack(pack, distributionSource("test:tier-scope"), PREFIXES).find(
    (v) => verbKey(v.path) === `${pack.noun} ${label}`,
  ) as VerbSpec;

const REAL = { dryRun: false, undo: false, yes: false };
const PLAIN: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const LLM: GlobalFlags = { ...PLAIN, llm: true, format: "llm" };
const JSON_FLAGS: GlobalFlags = { ...PLAIN, format: "json" };

let rt: PragmaRuntime;

/** The runtime with a `tier` config value, and optionally another format. */
const withTier = (tier?: string, flags: GlobalFlags = PLAIN): PragmaRuntime =>
  ({
    ...rt,
    globalFlags: flags,
    loadConfig: async () => {
      const layers = await rt.loadConfig();
      return {
        ...layers,
        config: { ...layers.config, ...(tier === undefined ? {} : { tier }) },
        origins: {
          ...layers.origins,
          tier: tier === undefined ? "default" : "global",
        },
      };
    },
  }) as PragmaRuntime;

/** One `widget list`, as the names it printed. */
async function names(
  params: Record<string, unknown>,
  runtime: PragmaRuntime = rt,
  pack: PackDefinition = KIT,
): Promise<string[]> {
  const page = (await verbFor(pack, "list").run(params, runtime)) as PackPage;
  return page.rows.map((row) => String(row.name));
}

/** One `widget list`'s page, for the facts it carries about itself. */
async function page(
  params: Record<string, unknown>,
  runtime: PragmaRuntime = rt,
): Promise<PackPage> {
  return (await verbFor(KIT, "list").run(params, runtime)) as PackPage;
}

beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

describe("the scope rule, over the tiers themselves", () => {
  const hierarchy = () =>
    buildTierHierarchy(
      [
        { iri: "https://example.org/kit#global", name: "Global" },
        { iri: "https://example.org/kit#apps", name: "Apps" },
        { iri: "https://example.org/kit#apps_lxd", name: "Apps/LXD" },
        { iri: "https://example.org/kit#sites", name: "Sites" },
      ],
      TIER_SCOPE,
    );

  const locals = (
    request: Parameters<typeof resolveTierScope>[1],
  ): string[] => {
    const scope = resolveTierScope(hierarchy(), request);
    return scope.kind === "all" ? ["*"] : scope.tiers.map((t) => t.local);
  };

  it("defaults to the tiers nothing sits above, base first", () => {
    // Top-level is a property of the NAME — `Apps/LXD` has a `/`, so something
    // sits above it — and the base leads so the chain reads root-to-leaf.
    expect(locals({})).toEqual(["global", "apps", "sites"]);
  });

  it("a chosen tier is itself, its ancestors, and the base", () => {
    expect(locals({ requested: "apps_lxd" })).toEqual([
      "global",
      "apps",
      "apps_lxd",
    ]);
    // A top-level choice is itself plus the base, and the base chosen is just
    // the base — never a scope wider than what was asked for.
    expect(locals({ requested: "sites" })).toEqual(["global", "sites"]);
    expect(locals({ requested: "global" })).toEqual(["global"]);
  });

  it("answers to every spelling this distribution publishes", () => {
    // The `Tier` column prints `apps_lxd`, `tier list` prints `Apps/LXD`, and
    // the config key's own documentation used `apps/lxd`. All three are the
    // reader's own words for one tier.
    for (const spelling of ["apps_lxd", "Apps/LXD", "apps/lxd", "APPS_LXD"]) {
      expect(locals({ requested: spelling })).toEqual([
        "global",
        "apps",
        "apps_lxd",
      ]);
    }
  });

  it("`all` turns the scope off, from either source", () => {
    expect(locals({ requested: "all" })).toEqual(["*"]);
    expect(locals({ configured: "all" })).toEqual(["*"]);
    expect(locals({ requested: "ALL" })).toEqual(["*"]);
  });

  it("the flag REPLACES the config, it does not intersect it", () => {
    // A chain is not an intersection of chains: an agent passing
    // `--tier apps_lxd` on a machine configured to `sites` means the first.
    expect(locals({ requested: "apps_lxd", configured: "sites" })).toEqual([
      "global",
      "apps",
      "apps_lxd",
    ]);
    expect(locals({ configured: "apps_lxd" })).toEqual([
      "global",
      "apps",
      "apps_lxd",
    ]);
    // An empty flag is not a choice — it falls through to the config.
    expect(locals({ requested: "", configured: "sites" })).toEqual([
      "global",
      "sites",
    ]);
  });

  it("refuses a tier nothing answers to, naming the ones that do", () => {
    expect(() => locals({ requested: "apps_nope" })).toThrowError(
      /Invalid tier/,
    );
    try {
      locals({ requested: "apps_nope" });
    } catch (error) {
      expect((error as { validOptions?: string[] }).validOptions).toEqual([
        "all",
        "apps",
        "apps_lxd",
        "global",
        "sites",
      ]);
    }
  });

  it("a graph with no tiers is not a narrowed graph", () => {
    // Nothing to scope by, so the read answers as it always did — and says
    // nothing about a scope it never applied.
    expect(resolveTierScope(buildTierHierarchy([], TIER_SCOPE), {}).kind).toBe(
      "all",
    );
  });
});

describe("the scope is compiled into the list query", () => {
  it("the default shows the top-level tiers, and nothing below them", async () => {
    // `Meter` and the LXD `Chip` are two levels down; `Loose` carries no tier
    // at all and is NOT a thing the scope can drop.
    expect(await names({})).toEqual([
      "Banner",
      "Bar",
      "Button",
      "Chip",
      "Loose",
    ]);
  });

  it("a chosen tier adds its own rows to its ancestors'", async () => {
    expect(await names({ tier: "apps_lxd" })).toEqual([
      "Bar",
      "Button",
      "Chip",
      "Chip",
      "Loose",
      "Meter",
    ]);

    // `Banner` is a SIBLING branch (Sites), so the chain excludes it.
    expect(await names({ tier: "apps_lxd" })).not.toContain("Banner");
  });

  it("`--tier all` is the unscoped read, byte for byte", async () => {
    expect(await names({ tier: "all" })).toEqual(await names({}, rt, UNSCOPED));
  });

  it("a story that declares no hierarchy is not scoped at all", async () => {
    // The scope reaches a noun because the noun DECLARES a hierarchy — the
    // same kernel, the same fixture, no narrowing.
    expect(await names({}, rt, UNSCOPED)).toHaveLength(7);
  });

  it("the scope decides before the page is cut", async () => {
    // Filtering after the page would let a row outside the scope consume one of
    // the caller's two slots, and the scope would then depend on where the page
    // happened to fall.
    const first = await page({ limit: 2 });
    expect(first.rows.map((row) => row.name)).toEqual(["Banner", "Bar"]);
    expect(first.nextAfter).toBeDefined();
    const second = await page({ limit: 2, after: first.nextAfter });
    expect(second.rows.map((row) => row.name)).toEqual(["Button", "Chip"]);
  });

  it("a cursor cannot be spent under a different scope", async () => {
    // The cursor is spendable only on the read that issued it, and the scope is
    // part of that read: paging on with a wider scope would walk a population
    // the cursor was not cut from.
    const first = await page({ limit: 2, tier: "apps_lxd" });
    await expect(
      page({ limit: 2, after: first.nextAfter, tier: "all" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("the configured tier is the default, and the flag overrides it", async () => {
    expect(await names({}, withTier("apps_lxd"))).toContain("Meter");
    expect(await names({ tier: "sites" }, withTier("apps_lxd"))).not.toContain(
      "Meter",
    );
    expect(await names({}, withTier("all"))).toHaveLength(7);
  });
});

describe("a scoped answer says so, in every format", () => {
  it("the page carries the scope as data", async () => {
    expect((await page({})).scope).toEqual({
      tiers: ["global", "apps", "sites"],
      counts: { global: 2, apps: 1, sites: 1, apps_lxd: 2, "no tier": 1 },
    });
    expect((await page({ tier: "all" })).scope).toBeUndefined();
  });

  it("llm: the heading names the tiers, beside the count", async () => {
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      {},
      REAL,
      withTier(undefined, LLM),
    );
    expect(outcome.stdout).toContain(
      "## Widget (5, tier scope: global 2, apps 1, sites 1, no tier 1)",
    );
  });

  it("llm: a page that is cut AND scoped admits both", async () => {
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      { limit: 2 },
      REAL,
      withTier(undefined, LLM),
    );
    expect(outcome.stdout).toContain(
      // The counts are of the WHOLE answer, not of the two rows in hand.
      "## Widget (2, more exist, tier scope: global 2, apps 1, sites 1, no tier 1)",
    );
  });

  it("plain: the sentence reaches stderr, where the notice seam puts it", async () => {
    // The plain form is a table a pipe reads as records, so it has no heading
    // to carry the scope — and stdout must stay data.
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      {},
      REAL,
      withTier(undefined, PLAIN),
    );
    expect(outcome.stdout).toContain("Button");
    expect(outcome.stderr).toContain(
      "Tier scope: global 2, apps 1, sites 1, no tier 1.",
    );
    expect(outcome.stderr).toContain("`--tier all` for every tier");
  });

  it("json: the scope rides meta as DATA, not only as prose", async () => {
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      {},
      REAL,
      withTier(undefined, JSON_FLAGS),
    );
    const envelope = JSON.parse(outcome.stdout as string);
    expect(envelope.meta.scope).toEqual({
      tiers: ["global", "apps", "sites"],
      counts: { global: 2, apps: 1, sites: 1, apps_lxd: 2, "no tier": 1 },
    });
    expect(envelope.meta.notice).toContain("Tier scope: global 2, apps 1,");
    // `data` keeps its shape: the bare row array it has always been.
    expect(Array.isArray(envelope.data)).toBe(true);
  });

  it("counts the FILTERED answer, and names the tier a miss lives in", async () => {
    // The case the breakdown is for: nothing in scope matches, and the answer
    // still says which tier to pass.
    const missed = await page({ search: "meter" });
    expect(missed.rows).toEqual([]);
    expect(missed.scope?.counts).toEqual({
      global: 0,
      apps: 0,
      sites: 0,
      apps_lxd: 1,
    });
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      { search: "meter" },
      REAL,
      withTier(undefined, LLM),
    );
    expect(outcome.stdout).toContain("other tiers: apps_lxd 1");
  });

  it("counts on the first page only, and a failed count never fails the list", async () => {
    const first = await page({ limit: 2 });
    expect(first.scope?.counts).toBeDefined();
    const second = await page({ limit: 2, after: first.nextAfter });
    expect(second.scope).toEqual({ tiers: ["global", "apps", "sites"] });

    const failing: PragmaRuntime = {
      ...rt,
      query: {
        ...rt.query,
        sparql: (text: string) =>
          text.includes("GROUP BY")
            ? Promise.reject(new Error("count failed"))
            : rt.query.sparql(text),
      },
    };
    const answer = await page({}, failing);
    expect(answer.rows).toHaveLength(5);
    expect(answer.scope).toEqual({ tiers: ["global", "apps", "sites"] });
  });

  it("counts ROWS per tier: an entity in two tiers counts under each, and its row is returned once", async () => {
    const { rt: twice } = await buildFixtureRuntime({
      ttl: `${TTL}\nex:button ex:tier ex:apps .`,
      prefixes: PREFIXES,
    });
    try {
      const answer = (await verbFor(KIT, "list").run({}, twice)) as PackPage;
      expect(answer.rows.filter((row) => row.name === "Button")).toHaveLength(
        1,
      );
      expect(answer.scope?.counts).toMatchObject({ global: 2, apps: 2 });
    } finally {
      (await twice.store.get()).store.dispose();
    }
  });

  it("an unscoped read says nothing about a scope", async () => {
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      { tier: "all" },
      REAL,
      withTier(undefined, JSON_FLAGS),
    );
    const envelope = JSON.parse(outcome.stdout as string);
    expect(envelope.meta.scope).toBeUndefined();
    expect(envelope.meta.notice).toBeUndefined();
  });

  it("a `--tier` that narrows to nothing names the flag it narrowed by", async () => {
    const outcome = await executeVerb(
      verbFor(KIT, "list"),
      { tier: "sites", search: "meter" },
      REAL,
      withTier(undefined, PLAIN),
    );
    const said = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
    expect(said).toContain("--tier sites");
  });
});

describe("a lookup prefers the scope and falls back rather than refusing", () => {
  const lookup = async (
    name: string,
    params: Record<string, unknown> = {},
    runtime: PragmaRuntime = rt,
  ): Promise<LookupOutput> =>
    (await verbFor(KIT, "lookup").run(
      { name: [name], ...params },
      runtime,
    )) as LookupOutput;

  it("a pattern applies the scope BEFORE the cap", async () => {
    // Five LXD widgets sort ahead of 55 global ones; none of them takes a slot.
    const wide = [
      ...Array.from({ length: 5 }, (_, i) => ["a", i, "apps_lxd"] as const),
      ...Array.from({ length: 55 }, (_, i) => ["w", i, "global"] as const),
    ]
      .map(
        ([stem, i, tier]) =>
          `ex:${stem}${i} a ex:Widget ; ex:name "${stem}.${String(i).padStart(2, "0")}" ; ex:tier ex:${tier} .`,
      )
      .join("\n");
    const { rt: crowded } = await buildFixtureRuntime({
      ttl: `${TTL}\n${wide}`,
      prefixes: PREFIXES,
    });
    try {
      const out = await lookup("*.*", {}, crowded);
      // Cut inside the scope: the total is the scope's, the rest is named.
      expect(out).toMatchObject({ total: 55, elsewhere: 5 });
      expect(
        lookupFormatters({ by: "ex:name" }, PREFIXES).notice?.(out, "mcp"),
      ).toContain(
        '50 of 55 matches shown, and 5 more in other tiers: pass `tier: "all"`.',
      );
      expect(out.results).toHaveLength(GLOB_EXPANSION_CAP);
      expect(out.results.every((e) => String(e.name).startsWith("w."))).toBe(
        true,
      );
      expect(out.outOfScope).toBeUndefined();
    } finally {
      (await crowded.store.get()).store.dispose();
    }
  });

  it("a pattern answers a shared name with the in-scope one alone, and an out-of-scope one with a line", async () => {
    expect((await lookup("Chi*")).results.map((e) => e.uri)).toEqual([
      "https://example.org/kit#chip",
    ]);
    const out = await lookup("Met*");
    expect(out.results.map((e) => e.name)).toEqual(["Meter"]);
    expect(out.outOfScope?.at(0)).toMatchObject({ tiers: ["apps_lxd"] });
    // The same redirect reached by a pattern AND by name is said once.
    const both = (await verbFor(KIT, "lookup").run(
      { name: ["Met*", "Meter"] },
      rt,
    )) as LookupOutput;
    expect(both.outOfScope).toHaveLength(1);
  });

  it("answers a shared name with the in-scope one alone", async () => {
    const out = await lookup("Chip");
    expect(out.results.map((entity) => entity.uri)).toEqual([
      "https://example.org/kit#chip",
    ]);
    expect(out.outOfScope).toBeUndefined();
  });

  it("`--tier all` answers with every one of them", async () => {
    const out = await lookup("Chip", { tier: "all" });
    expect(out.results).toHaveLength(2);
  });

  it("answers an OUT-OF-SCOPE name anyway, and says where from", async () => {
    // The alternative is ENTITY_NOT_FOUND about a widget the store holds and
    // `widget list --tier apps_lxd` prints. A name a reader typed is evidence
    // they mean something; the scope decides WHICH, never WHETHER.
    const out = await lookup("Meter");
    expect(out.results.map((entity) => entity.uri)).toEqual([
      "https://example.org/kit#meter",
    ]);
    expect(out.outOfScope).toEqual([
      { query: "Meter", tiers: ["apps_lxd"], scope: "global, apps, sites" },
    ]);
  });

  it("the fallback is one line, in the body a reader is looking at", async () => {
    const outcome = await executeVerb(
      verbFor(KIT, "lookup"),
      { name: ["Meter"] },
      REAL,
      withTier(undefined, PLAIN),
    );
    expect(outcome.stdout).toContain(
      'No "Meter" in the tier scope (global, apps, sites) — answering from apps_lxd.',
    );
    expect(outcome.stdout).toContain("--tier all");
  });

  it("an untiered entity is in every scope", async () => {
    const out = await lookup("Loose");
    expect(out.results).toHaveLength(1);
    expect(out.outOfScope).toBeUndefined();
  });

  it("an IRI-addressed lookup is never scoped", async () => {
    // An IRI reaches exactly one entity, so there is nothing for a scope to
    // choose between — and a caller who pasted it has already said which tier.
    const out = await lookup("ex:meter");
    expect(out.results.map((entity) => entity.uri)).toEqual([
      "https://example.org/kit#meter",
    ]);
    expect(out.outOfScope).toBeUndefined();
  });

  it("does not leak the kernel's scope variable into the answer", async () => {
    const out = await lookup("Button");
    expect(Object.keys(out.results[0] ?? {})).toEqual(["uri", "name"]);
  });
});
