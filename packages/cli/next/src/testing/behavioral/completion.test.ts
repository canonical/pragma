/**
 * B10 — the LIVE `__complete` candidate contract over the live read surface.
 *
 * The full completion engine (`kernel/completion`: parse → resolve → rank, the
 * spec-derived model, the entity seam) owns the unit-level guarantees; this
 * pins the behaviour end-to-end against the LIVE capabilities and — for the
 * entity tier — against a REAL built pack index on disk (the locked-pack branch
 * of the storeless reader, which the engine's own tests exercise only via the
 * embedded fallback). Parameterized over the live read surface so noun/verb
 * renames never churn it.
 *
 * The engine's `runComplete(words, modules, env)` is async and never throws;
 * the entity tier is fed by `indexCompletionEnv(cwd)` — a storeless read of the
 * active pack's `index.json`, never a store boot.
 */

import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { runComplete } from "../../kernel/completion/complete.js";
import { indexCompletionEnv } from "../../kernel/completion/entitySource.js";
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
  it("a live prefix resolves exactly the matching live nouns, sorted", async () => {
    const expected = liveNouns.filter((n) => n.startsWith("s")).sort();
    expect(expected.length).toBeGreaterThan(0); // sanity: the sweep covers something
    await expect(runComplete(["s"], capabilities)).resolves.toEqual(expected);
  });

  it("an unknown prefix resolves to nothing", async () => {
    await expect(
      runComplete(["zzz-not-a-noun"], capabilities),
    ).resolves.toEqual([]);
  });

  it("strips a leading program name some shells include", async () => {
    const expected = liveNouns.filter((n) => n.startsWith("s")).sort();
    await expect(runComplete(["pragma", "s"], capabilities)).resolves.toEqual(
      expected,
    );
  });
});

describe("verb-level candidates: the SET matches the live surface", () => {
  const multiVerbNouns = [...verbsByNoun.entries()].filter(
    ([, verbs]) => verbs.length > 1,
  );

  it("has at least one multi-verb noun to sweep", () => {
    expect(multiVerbNouns.length).toBeGreaterThan(0);
  });

  it.each(
    multiVerbNouns,
  )("%s: candidates == its live verb set", async (noun, verbs) => {
    const candidates = await runComplete([noun, ""], capabilities);
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

describe("entity params resolve from a real built pack index (B10)", () => {
  it("a lookup's entity positional completes from the built pack index", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: ALL_VISIBLE_CONFIG,
    });
    try {
      // The locked-pack branch of the storeless reader: a real index.json on
      // disk under the fixture cwd, read without booting the store.
      const all = await runComplete(
        ["block", "lookup", ""],
        capabilities,
        indexCompletionEnv(fixture.cwd),
      );
      expect(all.length).toBeGreaterThan(0);

      const narrowed = await runComplete(
        ["block", "lookup", "ds:b"],
        capabilities,
        indexCompletionEnv(fixture.cwd),
      );
      // Every ranked candidate carries the partial (case-insensitive), and the
      // filter is strictly narrowing — the index tier really ran.
      expect(
        narrowed.every((name) => name.toLowerCase().includes("ds:b")),
      ).toBe(true);
      expect(narrowed.length).toBeGreaterThan(0);
      expect(narrowed.length).toBeLessThan(all.length);
    } finally {
      await fixture.dispose();
    }
  });
});

describe("global flags complete for a dash prefix, at any position", () => {
  it("completes global flags regardless of position", async () => {
    await expect(runComplete(["--l"], capabilities)).resolves.toEqual([
      "--llm",
    ]);
  });
});
