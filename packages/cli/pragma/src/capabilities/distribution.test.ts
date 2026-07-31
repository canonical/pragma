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
import { declaredStories } from "./distribution.js";
import { capabilities } from "./index.js";

describe("the distribution's declared stories (PROTECTED)", () => {
  it("declares exactly the five domain nouns", () => {
    // The composites (`block`, `token`, `tier`) read their story by name and
    // fall back to no verbs if it is missing, so a renamed or dropped noun must
    // fail HERE rather than silently shrink a command.
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
});
