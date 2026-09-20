/**
 * Lookup ADDRESSING (PROTECTED): which argument shapes a pack lookup accepts,
 * and whether the answer is the same twice.
 *
 * A lookup's `<name...>` positional is documented — in the generated reference,
 * in the MCP tool schema, and by shell completion, which offers prefixed IRIs
 * and nothing else — as accepting a name, a prefixed name, an absolute IRI, or
 * a glob. These assert that the resolver honours the shape it is handed rather
 * than the source its pack declares, that an entity is addressable by IRI even
 * when it carries no `by` value, that a name reaches its entity through the
 * whitespace either side may be padded with, and that an ambiguous name answers
 * with the same entity on every store and every machine — while NAMING the ones
 * it did not answer with.
 *
 * That last clause is a REVERSAL, signed off by the owner. It used to read "an
 * ambiguous name resolves to the SAME entity every time", and the suite proved
 * it: a total `ORDER BY` under a `LIMIT 1` does make the answer reproducible.
 * It just made it reproducibly SILENT — `block lookup button` answered with
 * Launchpad's Button on every machine, because `apps_launchpad…` sorts before
 * `global…`, and nothing in the payload said the global one existed. The arity
 * is unchanged and deliberately so; what the old assertions took for the whole
 * property, determinism, was only half of it.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AMBIGUOUS_TTL,
  BLOCK_PREFIXES,
  BLOCK_TTL,
} from "../../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import type { PragmaRuntime } from "../runtime/types.js";
import { compilePack } from "./compile.js";
import { lookupFormatters, lookupOptions } from "./renderPack.js";
import { GLOB_EXPANSION_CAP, type LookupOutput } from "./resolveEntity.js";
import type { PackDefinition, PackLookup } from "./types.js";
import { distributionSource } from "./types.js";
import { verbKey } from "./uniqueness.js";

const DS = "https://ds.canonical.com/";

/** A graphql-sourced pack — the shape `block` and `modifier` declare. */
const GQL: PackDefinition = {
  noun: "gblock",
  lookup: {
    source: "graphql",
    by: "ds:name",
    types: ["ds:Component", "ds:Pattern", "ds:Subcomponent"],
    graphqlType: "UIBlock",
    fields: [{ name: "summary", property: "ds:summary" }],
  },
};

/** A sparql-sourced pack — the shape `tier`, `token` and `standard` declare. */
const SPQ: PackDefinition = {
  noun: "sblock",
  lookup: {
    source: "sparql",
    by: "ds:name",
    type: "ds:Component",
    fields: [{ name: "summary", property: "ds:summary" }],
  },
};

describe("pack lookup addressing (PROTECTED)", () => {
  let rt: PragmaRuntime;

  beforeAll(async () => {
    ({ rt } = await buildFixtureRuntime({
      ttl: BLOCK_TTL + AMBIGUOUS_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "detailed",
    }));
  });

  afterAll(async () => {
    (await rt.store.get()).store.dispose();
  });

  const lookupVia = (
    definition: PackDefinition,
    ...name: string[]
  ): Promise<LookupOutput> => {
    const verb = compilePack(
      definition,
      distributionSource("t"),
      BLOCK_PREFIXES,
    ).find((v) => verbKey(v.path) === `${definition.noun} lookup`);
    if (!verb) throw new Error("no lookup verb");
    return verb.run({ name }, rt) as Promise<LookupOutput>;
  };

  const lookupNoticeVia = (
    definition: PackDefinition,
    out: LookupOutput,
  ): string | undefined =>
    lookupFormatters(definition.lookup as PackLookup, BLOCK_PREFIXES).notice?.(
      out,
    );

  const uris = (out: LookupOutput): string[] =>
    out.results.map((entity) => String(entity.uri));

  describe("an IRI addresses an entity on EVERY pack, not just sparql ones", () => {
    it("resolves a prefixed name on a graphql-sourced pack", async () => {
      const out = await lookupVia(GQL, "ds:button");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}button`]);
    });

    it("resolves an absolute IRI on a graphql-sourced pack", async () => {
      const out = await lookupVia(GQL, `${DS}modal`);
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}modal`]);
    });

    it("still resolves a plain name on a graphql-sourced pack", async () => {
      const out = await lookupVia(GQL, "Modal");
      expect(uris(out)).toEqual([`${DS}modal`]);
    });

    it("reports an IRI that names nothing as a clean miss", async () => {
      await expect(lookupVia(GQL, "ds:nosuchblock")).rejects.toMatchObject({
        code: "ENTITY_NOT_FOUND",
      });
    });
  });

  describe("an IRI addresses an entity that carries no `by` value", () => {
    it("resolves it on the sparql path", async () => {
      const out = await lookupVia(SPQ, "ds:nameless.widget");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}nameless.widget`]);
      expect(out.results.at(0)?.summary).toBe(
        "Carries no ds:name; addressable only by IRI.",
      );
    });

    it("resolves it on the graphql path", async () => {
      const out = await lookupVia(GQL, "ds:nameless.widget");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}nameless.widget`]);
    });

    it("titles it with the prefixed IRI it was addressed by", () => {
      const options = lookupOptions(SPQ.lookup as PackLookup, BLOCK_PREFIXES);
      expect(options.title({ uri: `${DS}nameless.widget` })).toBe(
        "ds:nameless.widget",
      );
    });
  });

  describe("a name resolves through the whitespace the graph carries", () => {
    // `ds:padded.timeline` is named "Timeline " in the fixture, exactly as 66
    // shipped names are — the transform that reads the source document keeps the
    // cell's trailing space. That padding is not part of the name: no surface
    // prints it and no user can type it on purpose, so a resolve it can defeat
    // is broken for every one of those entities.
    it("resolves a padded name by the name a user can type", async () => {
      const out = await lookupVia(SPQ, "Timeline");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}padded.timeline`]);
    });

    it("resolves it on the graphql path too, where the resolve is the same SPARQL", async () => {
      const out = await lookupVia(GQL, "Timeline");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}padded.timeline`]);
    });

    it("trims the ARGUMENT as well, so a pasted name reaches a clean entity", async () => {
      // The other direction, and the reason both sides are trimmed rather than
      // just `?name`: a name copied out of a table cell arrives padded, and
      // Modal's own name is not.
      const out = await lookupVia(SPQ, "  Modal\t");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}modal`]);
    });

    it("still folds case while it folds the padding", async () => {
      expect(uris(await lookupVia(SPQ, "timeline"))).toEqual([
        `${DS}padded.timeline`,
      ]);
    });

    it("keeps the entity's own name LITERAL in the answer", async () => {
      // The trim is a matching rule, not a rendering one. What the graph holds
      // is what a reader is shown, so the upstream correction to the transform
      // is visible when it lands instead of being papered over here.
      const out = await lookupVia(SPQ, "Timeline");
      expect(out.results.at(0)?.name).toBe("Timeline ");
    });

    it("suggests it by its literal name on a genuine typo", async () => {
      // A real miss still names the padded candidate exactly as the graph holds
      // it — the trim decides what MATCHES and changes nothing about what a
      // reader is shown. What can no longer happen is the reported
      // `Did you mean? - Timeline` whose only difference from the query was the
      // padding: that case resolves now, and the suggester's own refusal to
      // restate a query is asserted in `project/cli/suggest.test.ts`.
      const reason = await lookupVia(SPQ, "Timelime").catch(
        (error: unknown) => error,
      );
      expect(reason).toMatchObject({ code: "ENTITY_NOT_FOUND" });
      expect((reason as { suggestions: string[] }).suggestions).toContain(
        "Timeline ",
      );
    });
  });

  describe("a glob expands over the population its own shape addresses", () => {
    it("expands an IRI-shaped glob on a sparql-sourced pack", async () => {
      const out = await lookupVia(SPQ, "ds:*.chip");
      expect(out.errors).toEqual([]);
      expect(uris(out).sort()).toEqual([`${DS}alpha.chip`, `${DS}zeta.chip`]);
    });

    it("expands an IRI-shaped glob on a graphql-sourced pack", async () => {
      const out = await lookupVia(GQL, "ds:button*");
      expect(out.errors).toEqual([]);
      expect(uris(out).sort()).toEqual([`${DS}button`, `${DS}button.icon`]);
    });

    it("reaches an entity with no `by` value through an IRI glob", async () => {
      const out = await lookupVia(SPQ, "ds:nameless.*");
      expect(uris(out)).toEqual([`${DS}nameless.widget`]);
    });

    it("still expands a name-shaped glob over names", async () => {
      const out = await lookupVia(SPQ, "Mod*");
      expect(uris(out)).toEqual([`${DS}modal`]);
    });

    it("expands an ABSOLUTE-IRI glob, not only the compact spelling", async () => {
      // An entity under a registered prefix has two legal spellings, and a
      // literal lookup honours both — so a glob that generalises one of them
      // must too. Expanding over the compact form alone made
      // `https://ds.canonical.com/but*` an EMPTY_RESULTS while the exact IRI
      // it generalises resolved fine.
      const out = await lookupVia(GQL, `${DS}button*`);
      expect(out.errors).toEqual([]);
      expect(uris(out).sort()).toEqual([`${DS}button`, `${DS}button.icon`]);
    });

    it("yields an entity ONCE when both its spellings match", async () => {
      // Reachable, not defensive: a glob counts as IRI-shaped if it contains
      // a colon, so `*:*chip` matches BOTH `ds:alpha.chip` and its absolute
      // twin. That is why the population is a spelling→entity map rather than
      // a flat list of both forms — a match under either spelling must render
      // one row, not two.
      const out = await lookupVia(SPQ, "*:*chip");
      expect(uris(out).sort()).toEqual([`${DS}alpha.chip`, `${DS}zeta.chip`]);
    });

    it("reports an IRI-shaped glob that matches nothing", async () => {
      await expect(lookupVia(SPQ, "ds:nosuch*")).rejects.toMatchObject({
        code: "EMPTY_RESULTS",
      });
    });
  });

  describe("a glob with no prefix reads names AND IRI local names", () => {
    it("reaches an entity through its local name", async () => {
      // The recorded case: `*.component.meter` is a pattern over what every
      // list prints, and it matched nothing while names were the only thing a
      // prefix-less glob was tried against.
      const out = await lookupVia(SPQ, "*.timeline");
      expect(out.errors).toEqual([]);
      expect(uris(out)).toEqual([`${DS}padded.timeline`]);
    });

    it("reaches an entity that carries no name at all", async () => {
      expect(uris(await lookupVia(SPQ, "nameless.*"))).toEqual([
        `${DS}nameless.widget`,
      ]);
    });

    it("answers ONCE for an entity both its name and its local name match", async () => {
      // `*chip` fits the name "Chip" and the local names `alpha.chip` and
      // `zeta.chip`. The name match already reaches both, so neither is looked
      // up a second time by IRI.
      const out = await lookupVia(SPQ, "*chip");
      expect(uris(out).sort()).toEqual([`${DS}alpha.chip`, `${DS}zeta.chip`]);
    });

    it("does not make a bare local name an address", async () => {
      await expect(lookupVia(SPQ, "alpha.chip")).rejects.toMatchObject({
        code: "ENTITY_NOT_FOUND",
      });
    });
  });

  describe("a miss suggests the real thing", () => {
    const suggestionsFor = async (query: string): Promise<string[]> => {
      const reason = await lookupVia(SPQ, query).catch(
        (error: unknown) => error,
      );
      expect(reason).toMatchObject({ code: "ENTITY_NOT_FOUND" });
      return (reason as { suggestions: string[] }).suggestions;
    };

    it("answers a pasted local name with its prefixed IRI, then the name inside it", async () => {
      expect((await suggestionsFor("alpha.chip")).slice(0, 2)).toEqual([
        "ds:alpha.chip",
        "Chip",
      ]);
    });

    it("answers a mistyped local name with the prefixed IRI it was near", async () => {
      expect(await suggestionsFor("nameless.widgit")).toContain(
        "ds:nameless.widget",
      );
    });

    it("every suggestion it prints resolves", async () => {
      const suggestions = await suggestionsFor("alpha.chip");
      const out = await lookupVia(SPQ, ...suggestions);
      expect(out.errors).toEqual([]);
    });

    it("keeps the five-suggestion cap", async () => {
      expect((await suggestionsFor("a")).length).toBeLessThanOrEqual(5);
    });
  });

  describe("an ambiguous name answers with EVERY entity it reaches", () => {
    // `ds:zeta.chip` is declared BEFORE `ds:alpha.chip` in the fixture, so the
    // store enumerates it first while IRI order puts `alpha` first. Neither of
    // these stories declares a ranking, so the order is the total `STR(?uri)`
    // it always was — what changed is that BOTH chips come back. Both paths,
    // because the resolve is generated SPARQL either way and only the field
    // fetch differs.
    it("answers with both, best first, on the sparql path", async () => {
      const out = await lookupVia(SPQ, "Chip");
      expect(uris(out)).toEqual([`${DS}alpha.chip`, `${DS}zeta.chip`]);
    });

    it("answers with both, best first, on the graphql path", async () => {
      const out = await lookupVia(GQL, "Chip");
      expect(uris(out)).toEqual([`${DS}alpha.chip`, `${DS}zeta.chip`]);
    });

    it("agrees with itself across repeated resolves", async () => {
      // Determinism was never the property in question — `LIMIT 1` over a total
      // order was already deterministic. It is pinned because the order now
      // carries the ranking's judgement, and an order that varied by store
      // would make the first result mean nothing.
      const runs = await Promise.all([
        lookupVia(SPQ, "Chip"),
        lookupVia(SPQ, "chip"),
        lookupVia(GQL, "CHIP"),
      ]);
      expect(runs.map(uris)).toEqual([
        [`${DS}alpha.chip`, `${DS}zeta.chip`],
        [`${DS}alpha.chip`, `${DS}zeta.chip`],
        [`${DS}alpha.chip`, `${DS}zeta.chip`],
      ]);
    });

    it("answers with ONE entity for an unambiguous name", async () => {
      // The plural case costs the singular one nothing: a unique name still
      // returns an array of one, which is the payload it always had.
      const out = await lookupVia(GQL, "Modal");
      expect(uris(out)).toEqual([`${DS}modal`]);
    });

    it("answers with ONE entity for an IRI, even a shared name's IRI", async () => {
      // An IRI is one entity by construction, so the IRI form keeps its
      // `LIMIT 1`: there is nothing to rank and nothing else to reach.
      const out = await lookupVia(SPQ, "ds:zeta.chip");
      expect(uris(out)).toEqual([`${DS}zeta.chip`]);
    });

    it("reaches both entities when a GLOB expands onto the shared name", async () => {
      // The glob population is DISTINCT names, so "Chip" expands to ONE
      // candidate — a glob was never the escape a shared name needs. Live,
      // `block lookup 'Butt*'` listed Launchpad's Button and ButtonLink while
      // the global Button appeared nowhere. Now the shared name reaches both
      // through the glob for the same reason it does through a plain name.
      const out = await lookupVia(SPQ, "Chi*");
      expect(uris(out)).toEqual([`${DS}alpha.chip`, `${DS}zeta.chip`]);
    });

    it("adds no notice — the payload IS the address", async () => {
      // An earlier draft kept the arity and named the outranked IRIs in a
      // notice. With every entity returned there is nothing set aside to name,
      // and a sentence restating what the payload already carries is noise.
      // The zero-record notice is untouched; only the ambiguity one is gone.
      expect(
        lookupNoticeVia(SPQ, await lookupVia(SPQ, "Chip")),
      ).toBeUndefined();
      expect(
        lookupNoticeVia(SPQ, await lookupVia(SPQ, "Modal")),
      ).toBeUndefined();
    });
  });
});

describe("a glob says what it did", () => {
  /** More same-family entities than one lookup's patterns may expand to. */
  const FAMILY = GLOB_EXPANSION_CAP + 12;
  const pad = (index: number): string => String(index).padStart(3, "0");
  const FAMILY_TTL = Array.from(
    { length: FAMILY },
    (_, index) =>
      `ds:swatch.${pad(index)} a ds:Component ; ds:name "swatch.${pad(index)}" .`,
  ).join("\n");

  let rt: PragmaRuntime;
  beforeAll(async () => {
    ({ rt } = await buildFixtureRuntime({
      ttl: BLOCK_TTL + AMBIGUOUS_TTL + FAMILY_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "detailed",
    }));
  });
  afterAll(async () => {
    (await rt.store.get()).store.dispose();
  });

  const lookup = (...name: string[]): Promise<LookupOutput> => {
    const verb = compilePack(SPQ, distributionSource("t"), BLOCK_PREFIXES).find(
      (v) => verbKey(v.path) === "sblock lookup",
    );
    if (!verb) throw new Error("no lookup verb");
    return verb.run({ name }, rt) as Promise<LookupOutput>;
  };
  const formatters = lookupFormatters(SPQ.lookup as PackLookup, BLOCK_PREFIXES);

  it("cuts a wide pattern at the cap and reports the true total", async () => {
    const out = await lookup("swatch.*");
    expect(out.results).toHaveLength(GLOB_EXPANSION_CAP);
    expect(out).toMatchObject({ truncated: true, total: FAMILY });
  });

  it("says so in each surface's own spelling, and in the condensed body", async () => {
    const out = await lookup("swatch.*");
    const counted = `${GLOB_EXPANSION_CAP} of ${FAMILY} matches shown.`;
    expect(formatters.notice?.(out, "cli")).toContain(counted);
    expect(formatters.notice?.(out, "cli")).toContain("`--detail summary`");
    expect(formatters.notice?.(out, "mcp")).toContain('`detail: "summary"`');
    expect(formatters.llm(out).split("\n").at(-1)).toContain(counted);
    expect(JSON.parse(formatters.json(out)).total).toBe(FAMILY);
  });

  it("does not advise summary to a caller already there", () => {
    const out: LookupOutput = {
      results: [],
      errors: [],
      truncated: true,
      total: FAMILY,
      detail: "summary",
    };
    expect(formatters.notice?.(out, "mcp")).toBe(
      `0 of ${FAMILY} matches shown. Narrow the pattern to reach the rest.`,
    );
  });

  it("counts ENTITIES: a name route and an IRI route to the same ones are one total", async () => {
    const out = await lookup("swatch.*", "ds:swatch.*");
    expect(out.total).toBe(FAMILY);
    expect(out.results).toHaveLength(GLOB_EXPANSION_CAP);
  });

  it("cuts the same fifty every time, in name order", async () => {
    const names = (await lookup("swatch.*")).results.map((e) => e.name);
    expect(names).toEqual(
      Array.from({ length: GLOB_EXPANSION_CAP }, (_, i) => `swatch.${pad(i)}`),
    );
    expect(
      (await lookup("*.0*", "swatch.*")).results.map((e) => e.name),
    ).toEqual(names);
  });

  it("says nothing about a pattern answered in full", async () => {
    const out = await lookup("swatch.00*");
    expect(out.results).toHaveLength(10);
    expect(out.truncated).toBeUndefined();
    expect(formatters.notice?.(out, "cli")).toBeUndefined();
  });

  it("counts an entry ONCE across overlapping patterns", async () => {
    // Twenty-seven matches over twenty-five entries: `swatch.001` and
    // `swatch.011` are each matched twice and answered once.
    const out = await lookup("swatch.00*", "swatch.0*1", "swatch.01*");
    expect(out.truncated).toBeUndefined();
    expect(out.results.map((entity) => entity.name)).toHaveLength(25);
    expect(new Set(out.results.map((entity) => entity.uri)).size).toBe(25);
  });

  it("answers once for an entity a name pattern and an IRI pattern both reach", async () => {
    const out = await lookup("swatch.001", "ds:swatch.001", "ds:swatch.00*");
    expect(out.results).toHaveLength(10);
  });

  it("never cuts a literal — not even one a cut pattern also matched", async () => {
    const last = `swatch.${pad(FAMILY - 1)}`;
    const out = await lookup("swatch.*", last);
    expect(out.results.map((entity) => entity.name)).toContain(last);
    expect(out.results).toHaveLength(GLOB_EXPANSION_CAP + 1);
  });
});
