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
    // The composites (`block`, `token`) read their story by name and fall back
    // to no verbs if it is missing, so a renamed or dropped noun must fail
    // HERE rather than silently shrink a command.
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

  it("the tier story is internally coherent, and coherent with the vocabulary", () => {
    // Both tier verbs are declared data now (L-OPEN-9), so the noun can no
    // longer disagree with ITSELF in code — but the list query spells its
    // class and property literally (`pragma.conf.ts` is inert data and imports
    // nothing) while the lookup declares them as fields, and the vocabulary
    // declares the addressing property once more for the index builder. This
    // holds all three to one class and one property, so a candidate that
    // completes still resolves and the index projects the names the lookup
    // matches.
    const story = declaredStories.get("tier");
    const query = story?.list?.query ?? "";
    expect(story?.lookup?.type).toBe("ds:Tier");
    expect(query).toContain(`a ${story?.lookup?.type}`);
    expect(story?.lookup?.by).toBe(VOCABULARY.altName);
    expect(query).toContain(`${VOCABULARY.altName} ?name`);
  });
});
