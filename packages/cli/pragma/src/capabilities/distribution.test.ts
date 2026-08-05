/**
 * The distribution's own declared read stories (PROTECTED).
 *
 * `pragma.conf.ts` is hand-authored data that the TypeScript compiler checks
 * against `PackDefinition`; `kernel/packs/schema.ts` is an independently written
 * zod grammar that every config- and package-declared story must pass. Nothing
 * forced the two to agree until the distribution started coming through the same
 * door — and the first thing that comparison found was `sample.fixedCount`,
 * documented and used by three of these five stories yet missing from the
 * `.strict()` sample schema, which made any third-party story declaring it die
 * with a fatal CONFIG_ERROR. Round-tripping ALL five is what keeps that shut.
 */

import { describe, expect, it } from "vitest";
import { parsePackDefinition } from "../kernel/packs/schema.js";
import { VOCABULARY } from "../kernel/vocabulary.js";
import { declaredStories } from "./distribution.js";
import { capabilities } from "./index.js";

describe("the distribution's declared stories (PROTECTED)", () => {
  it("declares exactly the five domain nouns", () => {
    // Every domain noun now reaches the registry ONLY through `storyModules`:
    // no authored module claims one, so `index.ts` appends them all unclaimed.
    // A renamed or dropped key therefore removes the noun from `capabilities`,
    // and with it from `--help`, `__complete` and the emitted surface — the
    // one hole the offline-install work exists to keep shut, and it would
    // close silently. Pinning the key set makes that fail HERE first.
    expect([...declaredStories.keys()].sort()).toEqual([
      "block",
      "modifier",
      "standard",
      "tier",
      "token",
    ]);
  });

  it.each([
    ...declaredStories.keys(),
  ])("the %s story validates against the pack grammar, unchanged", (noun) => {
    const story = declaredStories.get(noun);
    expect(
      parsePackDefinition(JSON.parse(JSON.stringify(story)), "pragma.conf.ts"),
    ).toEqual(story);
  });

  it("every declared noun reaches the registry as an overridable module", () => {
    for (const noun of declaredStories.keys()) {
      const module = capabilities.find((entry) => entry.name === noun);
      expect(module, `no capability module for "${noun}"`).toBeDefined();
      // `story: true` is what lets a project's own story REPLACE it at
      // dispatch; without it the noun would be treated as authored CLI.
      expect(module?.story).toBe(true);
      expect(module?.verbs.length).toBeGreaterThan(0);
    }
  });

  it("the tier story agrees with itself about what a tier is and what names it", () => {
    // The tier noun is entirely declared now, so nothing outside this object
    // decides what a tier IS — but the object can still disagree with itself,
    // and that disagreement is the coupling where a candidate completes and
    // then fails to resolve. Completion draws candidates from the index entries
    // whose type is `lookup.type`; the name resolve constrains on the same
    // class and matches on `lookup.by`. If `list.query` selected one class and
    // the lookup another, `tier list` would advertise names `tier lookup`
    // rejects.
    //
    // `by` is held to `VOCABULARY.altName` because that is the property the
    // pack index projects into `altNames`, so a name shown by `tier list` is a
    // name the lookup can match. `pragma.conf.ts` is inert data and imports
    // nothing, so it spells both literally; this is what keeps them equal.
    const story = declaredStories.get("tier");
    if (!story) {
      throw new Error('pragma.conf.ts declares no story for "tier"');
    }
    const query = story.list?.query;
    const type = story.lookup?.type;
    if (query === undefined || type === undefined) {
      throw new Error(
        'the "tier" story declares no list query or no lookup type',
      );
    }
    expect(query).toContain(`a ${type}`);
    expect(story.lookup?.by).toBe(VOCABULARY.altName);
    expect(query).toContain(`${VOCABULARY.altName} ?name`);
  });
});
