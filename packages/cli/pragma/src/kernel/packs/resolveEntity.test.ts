/**
 * Lookup ADDRESSING (PROTECTED): which argument shapes a pack lookup accepts,
 * and whether the answer is the same twice.
 *
 * A lookup's `<name...>` positional is documented — in the generated reference,
 * in the MCP tool schema, and by shell completion, which offers prefixed IRIs
 * and nothing else — as accepting a name, a prefixed name, an absolute IRI, or
 * a glob. These assert that the resolver honours the shape it is handed rather
 * than the source its pack declares, that an entity is addressable by IRI even
 * when it carries no `by` value, and that an ambiguous name resolves to the
 * same entity on every store and every machine.
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
import type { LookupOutput } from "./resolveEntity.js";
import type { PackDefinition } from "./types.js";
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

    it("reports an IRI-shaped glob that matches nothing", async () => {
      await expect(lookupVia(SPQ, "ds:nosuch*")).rejects.toMatchObject({
        code: "EMPTY_RESULTS",
      });
    });
  });

  describe("an ambiguous name resolves to the SAME entity every time", () => {
    // `ds:zeta.chip` is declared BEFORE `ds:alpha.chip` in the fixture, so the
    // store enumerates it first while IRI order puts `alpha` first. Without an
    // explicit ORDER BY the winner is whichever the store happens to yield —
    // exactly the cross-tier `Button` ambiguity in the live graph.
    it("picks the lowest IRI on the sparql path", async () => {
      const out = await lookupVia(SPQ, "Chip");
      expect(uris(out)).toEqual([`${DS}alpha.chip`]);
    });

    it("picks the lowest IRI on the graphql path", async () => {
      const out = await lookupVia(GQL, "Chip");
      expect(uris(out)).toEqual([`${DS}alpha.chip`]);
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
    });
  });
});
