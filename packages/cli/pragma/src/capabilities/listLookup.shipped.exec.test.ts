/**
 * The list→lookup grammar, EXECUTED against the shipped pack, for every noun
 * that has both halves (PROTECTED).
 *
 * The tool descriptions instruct an agent to take a row's `name` VERBATIM from
 * `<noun>_list` to `<noun>_lookup`. That promise broke for `standard` when the
 * shipped data and the story keyed the two halves on different properties:
 * `standard list` published names synthesized from the IRI while
 * `standard lookup` answered only the ~13% of standards carrying an asserted
 * `cs:name` — a closed loop where every published address missed (#1047). The
 * fixture suites could not see it, because a fixture obligingly asserts
 * whatever the story reads; only the corpus the release actually ships can
 * falsify the promise the release actually makes.
 *
 * So this file boots the SHIPPED graph and asserts the round trip over the
 * WHOLE corpus, not a sample, for every noun with a list+lookup pair — the
 * defect class is not standard-specific, since every pair shares this
 * machinery. Three guarantees per noun:
 *
 * - every name `list` publishes resolves through `lookup` (executed through
 *   the real verb bodies, so glob/IRI argument-shape dispatch is exercised
 *   with the very strings an agent would paste);
 * - every published name is in the addressable population (`listEntityNames`
 *   — the ONE pool that feeds miss-suggestions, glob expansion AND `sample`'s
 *   draw), so a suggestion can never offer a name the resolve cannot answer;
 * - for a story that derives names (`nameFallback: "iri"`), that pool covers
 *   the WHOLE class population — `sample` is presented as "see real data
 *   shapes", and drawing only from the subset carrying an asserted name would
 *   be the #1047 defect wearing sample's clothes.
 *
 * The final describe is the negative control: the same assertions run against
 * a fixture compiled in the exact pre-#1047 shape (a list that synthesizes
 * names over a lookup that requires the asserted property) and are shown to
 * FAIL. A guard whose failing case no longer fails is worse than no guard.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileStoryModule } from "../kernel/packs/compile.js";
import { listEntityNames } from "../kernel/packs/resolveEntity.js";
import {
  distributionSource,
  type PackDefinition,
} from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories, storyModules } from "./distribution.js";

/** The provenance label the distribution's own compiled stories carry. */
const SOURCE = distributionSource("pragma.conf.ts");

/**
 * Every noun declaring BOTH halves of the grammar, derived from the config
 * rather than listed — a story added tomorrow is covered the moment it is
 * declared, by the author who declares it and without their help.
 */
const NOUNS: readonly string[] = [...declaredStories]
  .filter(([, story]) => story.list !== undefined && story.lookup !== undefined)
  .map(([noun]) => noun);

/**
 * Nouns whose shipped corpus is empty TODAY (`ds:Token` has no instances in
 * the current packs) — a data-content gap this suite does not own.
 *
 * The allowlist EXPIRES BY CONSTRUCTION: an entry here is asserted to have
 * ZERO rows, so the moment upstream ships instances the entry goes red and
 * must be deleted. A list that merely skipped the non-empty assertion would
 * be a permanent blind spot — `token` gains data, nobody removes the entry,
 * a later regression back to zero rows stays vacuously green — which is
 * exactly the hidden-empty case this guard exists to prevent, sitting inside
 * the guard itself.
 */
const EMPTY_CORPUS_TODAY: readonly string[] = ["token"];

/** The verb `<noun> <verb>` from a compiled module, or throw naming the gap. */
function verbOf(
  module: CapabilityModule,
  noun: string,
  verb: string,
): VerbSpec {
  const found = module.verbs.find((v) => verbKey(v.path) === `${noun} ${verb}`);
  if (!found) throw new Error(`no compiled "${noun} ${verb}" verb`);
  return found;
}

/** Run `<noun> list` and return the names it publishes, verbatim, deduped. */
async function publishedNames(
  rt: PragmaRuntime,
  module: CapabilityModule,
  noun: string,
): Promise<string[]> {
  const rows = (await verbOf(module, noun, "list").run({}, rt)) as Record<
    string,
    string
  >[];
  return [
    ...new Set(rows.map((row) => row.name ?? "").filter((name) => name !== "")),
  ];
}

/**
 * Take every published name VERBATIM through the real lookup verb, exactly as
 * the tool description instructs an agent to, and return the per-name errors.
 * One batched call: the resolver treats each name independently, and a total
 * miss throws — surfaced as one synthetic error so the assertion that reads
 * this stays a set comparison rather than a try/catch.
 */
async function lookupErrors(
  rt: PragmaRuntime,
  module: CapabilityModule,
  noun: string,
  names: readonly string[],
): Promise<{ query: string; code: string }[]> {
  if (names.length === 0) return [];
  try {
    const output = (await verbOf(module, noun, "lookup").run(
      { name: [...names] },
      rt,
    )) as { errors: { query: string; code: string }[] };
    return output.errors;
  } catch (error) {
    return [
      {
        query: `(all ${names.length})`,
        code: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

// ONE store for the file — booting the shipped pack is the expensive part, and
// this package already contends under parallel runs.
let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  await rt.store.get();
}, 60_000);
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** One scalar from the shipped graph, queried directly. */
async function scalar(query: string): Promise<string | undefined> {
  const result = await rt.query.sparql(query);
  if (result.type !== "select") return undefined;
  const row = result.bindings[0];
  return row === undefined ? undefined : Object.values(row)[0];
}

describe("every list-published name resolves through lookup, whole corpus (PROTECTED)", () => {
  it("derives at least one list+lookup noun from the config", () => {
    expect(NOUNS.length).toBeGreaterThan(0);
    // The two nouns this guarantee has already been broken for / leaned on.
    expect(NOUNS).toContain("standard");
    expect(NOUNS).toContain("block");
  });

  it.each(
    NOUNS.map((noun) => [noun] as const),
  )("%s: every published name round-trips, and its corpus is not silently empty", async (noun) => {
    const module = storyModules.get(noun) as CapabilityModule;
    const names = await publishedNames(rt, module, noun);
    if (EMPTY_CORPUS_TODAY.includes(noun)) {
      // Asserted empty, not skipped: this is what expires the allowlist.
      expect(
        names,
        `${noun} is allowlisted as an empty corpus but published rows — ` +
          "delete it from EMPTY_CORPUS_TODAY so a later regression to zero rows cannot hide behind the entry",
      ).toEqual([]);
    } else {
      expect(
        names.length,
        `${noun} list published no rows at all from the shipped pack`,
      ).toBeGreaterThan(0);
    }

    const errors = await lookupErrors(rt, module, noun, names);
    expect(
      errors,
      `${noun} list published ${errors.length} name(s) its own lookup cannot resolve — ` +
        "the two-step grammar the tool descriptions document is broken for every agent following it",
    ).toEqual([]);
  }, 120_000);

  it.each(
    NOUNS.map((noun) => [noun] as const),
  )("%s: every published name is in the pool that feeds suggestions, globs and sample", async (noun) => {
    const story = declaredStories.get(noun) as PackDefinition;
    const lookup = story.lookup;
    if (!lookup) throw new Error(`no "${noun}" lookup`);
    const module = storyModules.get(noun) as CapabilityModule;

    const names = await publishedNames(rt, module, noun);
    const pool = await listEntityNames(rt, lookup, SOURCE);
    // The resolve matches case-insensitively; hold the pool to the same bar.
    const addressable = new Set(pool.map((name) => name.toLowerCase()));
    const missing = names.filter(
      (name) => !addressable.has(name.toLowerCase()),
    );
    expect(
      missing,
      `${noun}: published but not addressable — a miss-suggestion or glob over this pool can hand out none of these, and sample can never draw them`,
    ).toEqual([]);
  }, 60_000);

  it.each(
    NOUNS.filter(
      (noun) => declaredStories.get(noun)?.lookup?.nameFallback === "iri",
    ).map((noun) => [noun] as const),
  )("%s: the derived-name pool covers the WHOLE class population (sample is representative)", async (noun) => {
    const story = declaredStories.get(noun) as PackDefinition;
    const lookup = story.lookup;
    if (!lookup?.type && !lookup?.types?.length) {
      throw new Error(`"${noun}" derives names without a class constraint`);
    }
    const types = (lookup.types ?? [lookup.type as string]).join(" ");
    // The pool is DISTINCT NAMES, and a name may be legitimately shared (two
    // shipped standards carry the same upstream rdfs:label; the ranked
    // resolve answers a shared name with every entity it reaches). So the
    // full-population claim is counted the way the pool is built: one name
    // per asserted `by` value, plus one derived name per instance carrying
    // none. A pool smaller than that is the #1047 defect — sample and
    // suggestions drawing from the labelled subset only. (A prose label
    // colliding with a slash-derived name would make this one too strict;
    // that collision would itself be a data defect worth the red bar.)
    const labelled = Number(
      await scalar(
        [
          "SELECT (COUNT(DISTINCT ?name) AS ?n) WHERE {",
          `  VALUES ?class { ${types} }`,
          `  ?uri a ?class ; ${lookup.by} ?name .`,
          "}",
        ].join("\n"),
      ),
    );
    const bare = Number(
      await scalar(
        [
          "SELECT (COUNT(DISTINCT ?uri) AS ?n) WHERE {",
          `  VALUES ?class { ${types} }`,
          "  ?uri a ?class .",
          `  FILTER NOT EXISTS { ?uri ${lookup.by} ?any . }`,
          "}",
        ].join("\n"),
      ),
    );
    const pool = await listEntityNames(rt, lookup, SOURCE);

    expect(labelled + bare).toBeGreaterThan(0);
    expect(
      pool.length,
      `${noun}: ${labelled} asserted name(s) + ${bare} instance(s) with none, but only ` +
        `${pool.length} addressable names — sample's draw pool is an unrepresentative slice of the corpus`,
    ).toBe(labelled + bare);
  }, 60_000);
});

describe("negative control: the pre-#1047 shape fails these assertions", () => {
  // The exact divergence that shipped: a list that COALESCEs an OPTIONAL
  // display name with an IRI-derived one, over a lookup that requires the
  // asserted property (no nameFallback). One fixture standard carries the
  // property; the other is published under a name the lookup cannot reach.
  const PREFIXES = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    cs: "http://pragma.canonical.com/codestandards#",
  };
  const TTL = `
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix owl: <http://www.w3.org/2002/07/owl#> .
    @prefix cs: <http://pragma.canonical.com/codestandards#> .

    cs:name a owl:DatatypeProperty .
    cs:description a owl:DatatypeProperty .

    cs:react.component.tsdoc a cs:CodeStandard ;
      cs:description "Published under a derived name; carries no cs:name." .
    cs:code.function.purity a cs:CodeStandard ;
      cs:name "Function purity" ;
      cs:description "Carries an asserted cs:name." .
  `;
  const BROKEN_STORY: PackDefinition = {
    noun: "standard",
    description: "pre-#1047 shape",
    list: {
      query: [
        "SELECT ?uri ?name ?description WHERE {",
        "  ?uri a cs:CodeStandard ;",
        "       cs:description ?description .",
        "  OPTIONAL { ?uri cs:name ?n . }",
        '  BIND(COALESCE(?n, REPLACE(STRAFTER(STR(?uri), "#"), "\\\\.", "/")) AS ?name)',
        "}",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "name", label: "Name" },
        { field: "description", label: "Description" },
      ],
    },
    lookup: {
      source: "sparql",
      by: "cs:name", // required — no nameFallback: the pre-#1047 population
      type: "cs:CodeStandard",
      fields: [
        {
          name: "description",
          property: "cs:description",
          label: "Description",
        },
      ],
    },
  };

  it("publishes a name its own lookup cannot resolve, and these assertions catch it", async () => {
    const { rt: fixtureRt } = await buildFixtureRuntime({
      ttl: TTL,
      prefixes: PREFIXES,
    });
    const module = compileStoryModule(BROKEN_STORY, SOURCE, PREFIXES);

    const names = await publishedNames(fixtureRt, module, "standard");
    expect(names).toContain("react/component/tsdoc");
    expect(names).toContain("Function purity");

    // The round-trip assertion goes RED on the synthesized name…
    const errors = await lookupErrors(fixtureRt, module, "standard", names);
    expect(errors.map((error) => error.query)).toEqual([
      "react/component/tsdoc",
    ]);

    // …and so does the pool-inclusion assertion: the addressable population
    // is only the labelled subset.
    const lookup = BROKEN_STORY.lookup;
    if (!lookup) throw new Error("fixture story has no lookup");
    const pool = await listEntityNames(fixtureRt, lookup, SOURCE);
    expect(pool).toEqual(["Function purity"]);
  }, 60_000);
});
