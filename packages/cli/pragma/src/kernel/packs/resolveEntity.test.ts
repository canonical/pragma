/**
 * Lookup ADDRESSING (PROTECTED): which argument shapes a pack lookup accepts,
 * and whether the answer is the same twice.
 *
 * A lookup's `<name...>` positional is documented — in the generated reference,
 * in the MCP tool schema, and by shell completion, which offers prefixed IRIs
 * and nothing else — as accepting a name, a prefixed name, an absolute IRI, or
 * a glob. These assert that the resolver honours the shape it is handed rather
 * than the source its pack declares, that an entity is addressable by IRI even
 * when it carries no `by` value, and that an ambiguous name answers with the
 * same entity on every store and every machine — while NAMING the ones it did
 * not answer with.
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
import type { LookupOutput } from "./resolveEntity.js";
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

  /** The IRIs a lookup set aside, flattened across the batch. */
  const outranked = (out: LookupOutput): string[] =>
    (out.ambiguous ?? []).flatMap((entry) => [...entry.others]);

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

  describe("an ambiguous name answers with ONE entity, and names the rest", () => {
    // `ds:zeta.chip` is declared BEFORE `ds:alpha.chip` in the fixture, so the
    // store enumerates it first while IRI order puts `alpha` first. Neither of
    // these stories declares a ranking, so the winner is the total `STR(?uri)`
    // it always was — what changed is that the chip it did NOT answer with is
    // now named. Both paths, because the resolve is generated SPARQL either way
    // and only the field fetch differs.
    it("answers the lowest IRI, and names the other, on the sparql path", async () => {
      const out = await lookupVia(SPQ, "Chip");
      expect(uris(out)).toEqual([`${DS}alpha.chip`]);
      expect(outranked(out)).toEqual([`${DS}zeta.chip`]);
    });

    it("answers the lowest IRI, and names the other, on the graphql path", async () => {
      const out = await lookupVia(GQL, "Chip");
      expect(uris(out)).toEqual([`${DS}alpha.chip`]);
      expect(outranked(out)).toEqual([`${DS}zeta.chip`]);
    });

    it("records the argument AS TYPED, not the name it matched", async () => {
      // The notice quotes it back, and quoting back a spelling the caller did
      // not use ("Chip" for a typed "chip") reads as a different question.
      const out = await lookupVia(SPQ, "chip");
      expect(out.ambiguous?.map((entry) => entry.query)).toEqual(["chip"]);
      expect(out.ambiguous?.at(0)?.chosen).toBe(`${DS}alpha.chip`);
    });

    it("agrees with itself across repeated resolves", async () => {
      const runs = await Promise.all([
        lookupVia(SPQ, "Chip"),
        lookupVia(SPQ, "chip"),
        lookupVia(GQL, "CHIP"),
      ]);
      expect(runs.map(uris)).toEqual([
        [`${DS}alpha.chip`],
        [`${DS}alpha.chip`],
        [`${DS}alpha.chip`],
      ]);
      expect(runs.map(outranked)).toEqual([
        [`${DS}zeta.chip`],
        [`${DS}zeta.chip`],
        [`${DS}zeta.chip`],
      ]);
    });

    it("says NOTHING for an unambiguous name", async () => {
      // The arity did not change, and neither does the payload of the reads
      // that were never ambiguous — 201 of the live block names, and every
      // argument on every other noun. `ambiguous` is absent, not empty.
      const out = await lookupVia(GQL, "Modal");
      expect(uris(out)).toEqual([`${DS}modal`]);
      expect(out.ambiguous).toBeUndefined();
    });

    it("says nothing for an IRI, even a shared name's IRI", async () => {
      // An IRI is one entity by construction — it IS the recovery the notice
      // hands out, so it must not itself report an ambiguity.
      const out = await lookupVia(SPQ, "ds:zeta.chip");
      expect(uris(out)).toEqual([`${DS}zeta.chip`]);
      expect(out.ambiguous).toBeUndefined();
    });

    it("names the other entity when a GLOB expands onto the shared name", async () => {
      // The glob population is DISTINCT names, so "Chip" expands to ONE
      // candidate and a glob is not the escape a shared name needs: live,
      // `block lookup 'Butt*'` listed Launchpad's Button and ButtonLink while
      // the global Button appeared nowhere. The notice reaches through the glob
      // for the same reason it reaches through a plain name.
      const out = await lookupVia(SPQ, "Chi*");
      expect(uris(out)).toEqual([`${DS}alpha.chip`]);
      expect(outranked(out)).toEqual([`${DS}zeta.chip`]);
    });

    it("renders the outranked IRIs as the verb's notice", async () => {
      // The seam, end to end: what the resolver set aside becomes the sentence
      // the dispatcher puts on stderr and both machine surfaces put in
      // `meta.notice` — in the COMPACT spelling, because the notice's only job
      // is to hand back an address the CLI accepts as an argument.
      const notice = lookupNoticeVia(SPQ, await lookupVia(SPQ, "Chip"));
      expect(notice).toContain("ds:zeta.chip");
      expect(notice).toContain("address it by IRI");
      expect(
        lookupNoticeVia(SPQ, await lookupVia(SPQ, "Modal")),
      ).toBeUndefined();
    });
  });
});
