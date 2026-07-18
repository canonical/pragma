/**
 * B10 — the THIN main-line `__complete` candidate contract (§6 boundary).
 *
 * PR-C (`claude/pragma-v2-completion`, merging at PR8) owns the FULL
 * completion engine: shell drivers, script goldens, rank/parse/resolve. This
 * pins only what the pr4-base main-line `kernel/completion/complete.ts`
 * actually does today, verified empirically (not assumed from the old
 * socket-daemon covenant — see the ADAPTATION notes below), parameterized
 * over the live read-noun surface.
 *
 * ADAPTATIONS (R2 — verified against the live engine):
 * - Noun-level candidates ARE sorted (`buildCompletionModel` sorts `nouns`)
 *   and entity-param candidates ARE sorted (`createIndexEntityReader`) — but
 *   VERB-level candidates are in AUTHORING order, not alphabetically sorted
 *   (`model.verbs[noun]` is never `.sort()`ed). Asserted as a SET here, not an
 *   order, so this test doesn't encode an accidental property as a contract.
 *   Left as a note for PR8: if the durable candidate covenant wants verb-level
 *   sorting too, that's PR-C's fuller engine to decide/carry.
 * - The main-line engine has NO per-verb FLAG completion at all — a `-`
 *   prefixed partial always resolves against the GLOBAL flags
 *   (`COMPLETION_GLOBAL_FLAGS`), never a verb's own params (confirmed: typing
 *   `block list --a<TAB>` does not offer `--all-tiers`). "Kebab-cased flags"
 *   is instead pinned at the EMISSION layer (`emitSurface`'s `kebabCase`),
 *   which is the real, live guarantee today; the completion-time flag offer
 *   is PR-C's to add.
 */

import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import {
  buildCompletionModel,
  complete,
  runComplete,
} from "../../kernel/completion/complete.js";
import { emitSurface } from "../../kernel/spec/emitSurface.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import { bootFixtureRuntime } from "../helpers/fixtureGraph.js";
import { liveVerbs } from "./liveReadSurface.js";

const liveNouns = [...new Set(liveVerbs.map((v) => v.noun))];
/** noun -> its live verb labels (self-verb nouns get one entry: the noun itself). */
const verbsByNoun = new Map<string, string[]>();
for (const v of liveVerbs) {
  const list = verbsByNoun.get(v.noun) ?? [];
  if (v.verb !== v.noun) list.push(v.verb);
  verbsByNoun.set(v.noun, list);
}

describe("noun-level candidates: sorted, prefix-filtered, program name stripped", () => {
  it("a live prefix resolves exactly the matching live nouns, sorted", () => {
    const expected = liveNouns.filter((n) => n.startsWith("s")).sort();
    expect(expected.length).toBeGreaterThan(0); // sanity: the sweep covers something
    expect(runComplete(["s"], capabilities)).toEqual(expected);
  });

  it("an unknown prefix resolves to nothing", () => {
    expect(runComplete(["zzz-not-a-noun"], capabilities)).toEqual([]);
  });
});

describe("verb-level candidates: the SET matches the live surface (order not asserted)", () => {
  const multiVerbNouns = [...verbsByNoun.entries()].filter(
    ([, verbs]) => verbs.length > 1,
  );

  it("has at least one multi-verb noun to sweep", () => {
    expect(multiVerbNouns.length).toBeGreaterThan(0);
  });

  it.each(
    multiVerbNouns,
  )("%s: candidates == its live verb set", (noun, verbs) => {
    const candidates = runComplete([noun, ""], capabilities);
    expect([...candidates].sort()).toEqual([...verbs].sort());
  });
});

describe("flags are kebab-cased at emission (the live, testable guarantee)", () => {
  it("every emitted flag is kebab-case, never camelCase", () => {
    const { nouns } = emitSurface(capabilities);
    let sawAtLeastOneFlag = false;
    for (const { verbs } of Object.values(nouns)) {
      for (const verb of verbs) {
        for (const flag of verb.flags ?? []) {
          sawAtLeastOneFlag = true;
          expect(flag).toMatch(/^--[a-z][a-z0-9-]*$/);
        }
      }
    }
    expect(sawAtLeastOneFlag).toBe(true);
  });
});

describe("entity params resolve from the index (B10)", () => {
  it("a lookup's entity positional completes from the built pack index, sorted", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: ALL_VISIBLE_CONFIG,
    });
    try {
      const all = runComplete(
        ["block", "lookup", ""],
        capabilities,
        fixture.cwd,
      );
      expect(all).toEqual([...all].sort());
      expect(all.length).toBeGreaterThan(0);

      const narrowed = runComplete(
        ["block", "lookup", "ds:b"],
        capabilities,
        fixture.cwd,
      );
      expect(narrowed.every((name) => name.startsWith("ds:b"))).toBe(true);
      expect(narrowed.length).toBeGreaterThan(0);
      expect(narrowed.length).toBeLessThan(all.length);
    } finally {
      await fixture.dispose();
    }
  });
});

describe("global flags complete for a dash prefix, at any position", () => {
  it("completes global flags regardless of position", () => {
    const model = buildCompletionModel(capabilities);
    expect(complete(["--l"], model)).toEqual(["--llm"]);
  });
});
