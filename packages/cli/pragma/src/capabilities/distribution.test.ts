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
import { compilePack } from "../kernel/packs/compile.js";
import { parsePackDefinition } from "../kernel/packs/schema.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { VOCABULARY } from "../kernel/vocabulary.js";
import { declaredStories, storyModules } from "./distribution.js";
import { capabilities } from "./index.js";

/** A verb's DECLARED shape — everything but the closures a compile mints fresh. */
function declaredShape(verb: VerbSpec): Record<string, unknown> {
  return {
    path: verb.path.join(" "),
    summary: verb.summary,
    doc: verb.doc,
    params: verb.params,
    capability: verb.capability,
    examples: verb.examples,
  };
}

describe("the distribution's declared stories (PROTECTED)", () => {
  it("declares exactly the five domain nouns", () => {
    // Every domain noun is now nothing BUT its story (L-OPEN-9), so a renamed
    // or dropped noun deletes a whole command rather than shrinking one — it
    // must fail HERE.
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

  it("ZERO hand-written data commands: a registered noun IS its compiled story", () => {
    // The machine form of L-OPEN-9's end state — "a fork defines its entire
    // read surface in pragma.conf.ts". Prose can go stale; this cannot. Every
    // declared noun's REGISTERED module (what the CLI, the MCP server and the
    // generated reference all project) must be verb-for-verb what recompiling
    // its story alone produces. Re-introducing a composite — an authored module
    // that prepends or appends a hand-written verb beside the story, which is
    // exactly how `block`, `token` and `tier` used to be built — fails here,
    // whatever the docblocks say.
    for (const [noun, story] of declaredStories) {
      const registered = capabilities.find((entry) => entry.name === noun);
      const compiled = compilePack(story, "pragma.conf.ts", DEFAULT_PREFIX_MAP);
      // Two halves, because a spec carries closures a fresh compile cannot
      // reproduce by identity. (1) SHAPE: recompiling the story alone must
      // yield the same verbs, declared the same way — an extra verb or an extra
      // flag beside the story fails here.
      expect(
        registered?.verbs.map(declaredShape),
        `"${noun}" registers verbs its story does not declare`,
      ).toEqual(compiled.map(declaredShape));
      // (2) IDENTITY: each registered verb must BE the compiled story's verb
      // object, not a look-alike. A composite module — the `[...story.verbs,
      // handWrittenVerb]` shape `block`, `token` and `tier` used to be built
      // with — constructs new objects, so it cannot pass this even if its
      // shapes happen to match.
      const fromStory = storyModules.get(noun)?.verbs ?? [];
      expect(registered?.verbs.length).toBe(fromStory.length);
      registered?.verbs.forEach((verb, index) => {
        expect(verb, `"${noun}" verb ${index} is not the story's`).toBe(
          fromStory[index],
        );
      });
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
