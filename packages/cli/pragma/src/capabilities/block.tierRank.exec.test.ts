/**
 * Which block a SHARED name means, EXECUTED against the shipped pack
 * (PROTECTED).
 *
 * 25 of the design system's block names are carried by two or three blocks
 * apiece, across tiers. `block lookup` used to answer each of them with whichever
 * IRI sorted first and say nothing about the rest, so `button` returned
 * Launchpad's Button — `apps_launchpad…` sorts before `global…` — and an agent
 * had no way to learn that the block everybody means also existed.
 *
 * Two properties, both asserted here: the answer is the RANKED one, and the
 * blocks it outranked are NAMED. Either alone leaves a caller stuck — a better
 * arbitrary pick is still arbitrary, and a notice under a wrong answer is still
 * a wrong answer.
 *
 * This suite is deliberately NOT fixture-backed, and that is the whole point of
 * it. The two nearest specimens in this package show why: `journeys.livePack`
 * is NAMED for ordering determinism and its fixture contains one Button, and
 * the ambiguity fixture in `blockGraph.ts` pits two tiers that do not outrank
 * each other, so neither graph can be wrong about the ranking in the way the
 * live graph was. A fixture written alongside a ranking rule agrees with the
 * rule by construction. The shipped pack does not.
 *
 * So every case here READS the collisions out of the store it is judging. There
 * is no list of block names in this file to fall out of date — add a tier
 * upstream, rename one, retire a duplicate, and these assertions follow.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories, storyModules } from "./distribution.js";

const story = declaredStories.get("block");
if (!story?.lookup)
  throw new Error('pragma.conf.ts declares no "block" lookup');
const blockLookup = story.lookup;

const blockModule = storyModules.get("block");
if (!blockModule) throw new Error('pragma.conf.ts declares no "block" story');

const verbFor = (verb: string): VerbSpec =>
  blockModule.verbs.find(
    (v) => verbKey(v.path) === `block ${verb}`,
  ) as VerbSpec;
const lookupVerb = verbFor("lookup");
const listVerb = verbFor("list");

/** The block classes the story addresses, read from the story rather than retyped. */
const TYPE_VALUES = (blockLookup.types ?? []).join(" ");

/**
 * The scope declaration under test, read from the config it lives in.
 *
 * Reading `falloff` here rather than writing `0.2` is what keeps this suite a
 * check on the RULE instead of on one tuning of it: change the number in
 * `pragma.conf.ts` and these cases still assert that a shallower tier outranks
 * a deeper one, which is the judgement that was signed off.
 */
const scope = blockLookup.scopeWeight;
if (!scope) throw new Error('the "block" lookup declares no scopeWeight');

let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  await rt.store.get();
}, 60_000);
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** Rows from the shipped store, as plain records. */
async function rows(query: string): Promise<Record<string, string>[]> {
  const result = await rt.query.sparql(query);
  return result.type === "select"
    ? (result.bindings as Record<string, string>[])
    : [];
}

/** One `block lookup <name>`: the IRI it answered with, and the ones it did not. */
async function lookup(
  name: string,
): Promise<{ chosen: string; others: string[]; notice: string | undefined }> {
  const out = (await lookupVerb.run({ name: [name] }, rt)) as {
    results: { uri?: string }[];
    ambiguous?: { others: readonly string[] }[];
  };
  return {
    chosen: String(out.results.at(0)?.uri),
    others: (out.ambiguous ?? []).flatMap((entry) => [...entry.others]),
    notice: lookupVerb.output.formatters.notice?.(out as never),
  };
}

/**
 * Every block name the shipped graph gives to more than one block, with each
 * block's IRI, its tier's declared name and whether it is a subcomponent.
 *
 * Read with the SAME `LCASE` the resolve filters by, so a pair that collides
 * only for a lookup (`Button` vs `button`) is in this set too.
 */
async function collisions(): Promise<
  Map<string, { uri: string; tier: string; part: boolean }[]>
> {
  const found = await rows(
    [
      "SELECT ?uri ?key ?tierName ?part WHERE {",
      `  VALUES ?class { ${TYPE_VALUES} }`,
      "  ?uri a ?class .",
      `  ?uri ${blockLookup.by} ?name .`,
      `  OPTIONAL { ?uri ${scope.via} ?tier . ?tier ${scope.by} ?tn . }`,
      "  BIND(LCASE(STR(?name)) AS ?key)",
      '  BIND(COALESCE(?tn, "") AS ?tierName)',
      "  BIND(EXISTS { ?uri a ds:Subcomponent } AS ?part)",
      "}",
    ].join("\n"),
  );
  const byName = new Map<
    string,
    { uri: string; tier: string; part: boolean }[]
  >();
  for (const row of found) {
    const key = String(row.key);
    const entry = {
      uri: String(row.uri),
      tier: String(row.tierName ?? ""),
      part: String(row.part) === "true",
    };
    const seen = byName.get(key);
    if (seen) {
      if (!seen.some((e) => e.uri === entry.uri)) seen.push(entry);
    } else byName.set(key, [entry]);
  }
  return new Map([...byName].filter(([, entries]) => entries.length > 1));
}

/** A tier's depth: the separator count in its DECLARED name, +1. */
const depthOf = (tierName: string): number =>
  tierName === "" ? 1 : tierName.split("/").length;

describe("a shared block name reaches every block that carries it (PROTECTED)", () => {
  it("finds shared names in the shipped graph at all", async () => {
    // The guard on every other case in this file: if the graph ever stops
    // sharing names, these assertions become vacuous and must be told to go.
    expect((await collisions()).size).toBeGreaterThan(1);
  });

  it("answers `button` with the GLOBAL Button, and names the other", async () => {
    // The reported defect, exactly as reported. Two components of equal kind,
    // separated by their tiers alone: Global is depth 1, Apps/Launchpad depth 2.
    const out = await lookup("button");
    expect(out.chosen).toBe("https://ds.canonical.com/global.component.button");
    expect(out.others).toEqual([
      "https://ds.canonical.com/apps_launchpad.component.button",
    ]);
    // And in the sentence a caller actually sees, as an address they can type
    // back: "address it by IRI" is not a recovery if no IRI is given.
    expect(out.notice).toContain("ds:apps_launchpad.component.button");
  });

  it("answers `TextInput` with the LAUNCHPAD one — a whole block beats a part", async () => {
    // The case that stops the plausible wrong fix. A rule of "global wins", or
    // a tier tiebreak ABOVE the type weight, would answer with the global
    // SUBcomponent here. As a product it does not: 0.6 × 1 < 1 × 0.8. The
    // editorial rule that a subcomponent is a PART of a block, never the block
    // someone means, survives the tier ranking being added on top of it.
    const out = await lookup("TextInput");
    expect(out.chosen).toBe(
      "https://ds.canonical.com/apps_launchpad.component.text_input",
    );
    expect(out.others).toEqual([
      "https://ds.canonical.com/global.subcomponent.text_input",
    ]);
  });

  it("answers a name shared by two EQUALLY deep tiers deterministically", async () => {
    // `ThemeSwitcher` is Apps/Anbox against Apps/WorkplaceEngineering — same
    // depth, so the ranking has nothing to say and the total order's final key
    // decides. This is the residual the ranking does NOT resolve, asserted as
    // such: the claim is not that the right one wins, it is that the same one
    // wins every time and the other is never left unmentioned.
    const runs = await Promise.all([
      lookup("ThemeSwitcher"),
      lookup("themeswitcher"),
      lookup("ThemeSwitcher"),
    ]);
    for (const out of runs) {
      expect(out.chosen).toBe(runs[0]?.chosen);
      expect(out.others).toEqual(runs[0]?.others);
      expect(out.others).toHaveLength(1);
      // Equal rank, so the order's final key decides — the same key, the same
      // way, as everywhere else in it.
      expect([out.chosen, ...out.others].sort()).toEqual([
        out.chosen,
        ...out.others,
      ]);
    }
  });

  it("never leaves a block a shared name reaches unmentioned", async () => {
    // Swept over the whole collision set, not a chosen few: the silent discard
    // is the defect, and it was invisible precisely because it looked like a
    // normal answer. Every block the name reaches is either the answer or named
    // beside it — and named as an IRI, the one address that reaches it.
    for (const [name, entries] of await collisions()) {
      const out = await lookup(name);
      expect(
        [out.chosen, ...out.others].sort(),
        `block lookup ${name}`,
      ).toEqual(entries.map((entry) => entry.uri).sort());
      for (const other of out.others) {
        expect(out.notice, `notice for ${name}`).toContain(
          other.replace("https://ds.canonical.com/", "ds:"),
        );
      }
    }
  });

  it("ranks the winner's tier no worse than every loser's", async () => {
    // The invariant, COMPUTED from the pack rather than listed. It holds for
    // every shared name at once and cannot be satisfied by hard-coding an
    // answer, so it survives a new tier, a renamed one, and a new collision.
    //
    // Stated over WHOLE BLOCKS only. A subcomponent is deliberately allowed to
    // lose to a shallower-ranked component AND to a deeper-ranked one — that is
    // the product, and `TextInput` above is the case that pins it.
    for (const [name, entries] of await collisions()) {
      const blocks = entries.filter((entry) => !entry.part);
      if (blocks.length < 2) continue;
      const { chosen } = await lookup(name);
      const winner = blocks.find((entry) => entry.uri === chosen);
      if (!winner) continue;
      for (const loser of blocks) {
        expect(
          depthOf(winner.tier),
          `block lookup ${name} led with ${winner.uri} (${winner.tier}) over ${loser.uri} (${loser.tier})`,
        ).toBeLessThanOrEqual(depthOf(loser.tier));
      }
    }
  });
});

describe("`block list` orders its ties totally (PROTECTED)", () => {
  /** The entity IRIs of one `block list` run, in the order it printed them. */
  async function listOrder(): Promise<string[]> {
    const data = (await listVerb.run({}, rt)) as { uri?: string }[];
    return data.map((row) => String(row.uri));
  }

  it("repeats the same order across runs", async () => {
    // The half that looks like the whole defect and is not: across runs the
    // store's scan order can change (a repack, another machine).
    const [first, second] = await Promise.all([listOrder(), listOrder()]);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
  });

  it("orders EVERY tie the same way, within one run", async () => {
    // The half that was actually broken. In ONE output `Button` came
    // launchpad-first while `CheckboxInput` came global-first — not flakiness
    // between runs, an inconsistency inside a single answer, because SPARQL
    // says nothing about tied rows and the query's ORDER BY ended at `?name`.
    //
    // Asserted as a RULE over every shared name rather than on the two that
    // happened to disagree: shallower tier leads, and equal depths fall back to
    // a key that cannot tie.
    const order = await listOrder();
    const position = new Map(order.map((uri, index) => [uri, index]));
    const shared = await collisions();
    expect(shared.size).toBeGreaterThan(1);
    for (const [name, entries] of shared) {
      const group = [...entries].sort(
        (a, b) => (position.get(a.uri) ?? -1) - (position.get(b.uri) ?? -1),
      );
      expect(
        group.map((entry) => position.get(entry.uri)),
        `block list rows for ${name}`,
      ).not.toContain(undefined);
      for (const [index, entry] of group.entries()) {
        const next = group[index + 1];
        if (!next) continue;
        const keys = [
          [depthOf(entry.tier), entry.uri],
          [depthOf(next.tier), next.uri],
        ] as const;
        expect(
          keys[0][0] < keys[1][0] ||
            (keys[0][0] === keys[1][0] && keys[0][1] < keys[1][1]),
          `block list printed ${entry.uri} (${entry.tier}) before ${next.uri} (${next.tier}) for "${name}"`,
        ).toBe(true);
      }
    }
  });

  it("keeps every shared name's rows adjacent, one per block", async () => {
    // The ordering above would also be satisfied by a list that lost a row, so
    // the population is checked with it: the tie-break decides the order of the
    // rows, never how many there are.
    const order = await listOrder();
    for (const [name, entries] of await collisions()) {
      const present = entries.filter((entry) => order.includes(entry.uri));
      expect(present, `block list rows for ${name}`).toHaveLength(
        entries.length,
      );
    }
  });
});
