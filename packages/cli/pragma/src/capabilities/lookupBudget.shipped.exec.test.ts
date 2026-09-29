/**
 * The response-size budget for a LOOKUP and for `graph inspect`, at every
 * disclosure level, measured over the SHIPPED pack (PROTECTED).
 *
 * The list budget beside this file bounds what a browse costs. A read of one
 * entity had no bound at all, and two recorded answers are why it has one now:
 * `token_lookup { name: ["color.*"] }` answered with 473 entities and 460 KB,
 * and `graph_inspect` of one block with 41 KB — neither with any way to be
 * asked for less, since most lookups declared no `detail`.
 *
 * So three things are held here, each over the whole shipped corpus and each
 * derived from the configuration rather than listed:
 *
 * - the LARGEST single entity a lookup answers with, per level — `summary` is
 *   the cheap level by measurement rather than by name;
 * - the widest possible pattern (`*`), which the expansion cap has to hold to
 *   a bounded answer on every noun;
 * - the largest `graph inspect` of a block, per level.
 *
 * WHERE IT IS ENFORCED, and why bytes of the re-serialised JSON: exactly as the
 * list budget does it, for the reasons given there.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DETAIL_LEVELS, type DetailLevel } from "../constants.js";
import { MAX_LIST_WINDOW } from "../kernel/packs/paging.js";
import {
  GLOB_EXPANSION_CAP,
  type LookupOutput,
} from "../kernel/packs/resolveEntity.js";
import type { PackPage } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../kernel/spec/types.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories, storyModules } from "./distribution.js";
import { graphModule } from "./graph/index.js";

/**
 * The ceiling on ONE looked-up entity, in bytes, per level.
 *
 * **Derived from measurement, 2026-09-17**, as the largest entity of any noun
 * at that level: 2,425 bytes at `summary` (a code standard), 25,282 at
 * `standard` (a concept, whose Markdown body arrives there) and 70,097 at
 * `detailed` (a block). Each ceiling is the measurement × 1.5, rounded — the
 * list budget's shape of derivation — so ordinary upstream growth in a pack
 * does not turn this red on a bump, and a lookup whose `summary` quietly grows
 * an expand does. Per noun, `summary` measured: token 548 (4,174 at
 * `detailed`), variable 393 (4,854), tier 101 (3,847), modifier 103 (203),
 * concept 763 (25,302), block 2,312 (70,097), standard 2,425 (6,622).
 */
const ENTITY_BUDGET_BYTES: Readonly<Record<DetailLevel, number>> = {
  summary: 3_700,
  standard: 38_000,
  detailed: 105_000,
};

/**
 * The ceiling on the answer to the widest pattern a noun can be handed.
 *
 * It moves with {@link GLOB_EXPANSION_CAP} and with how fat a noun's entities
 * are. Measured 2026-09-17: `block` at 22,592 bytes (`summary`) and 206,809
 * (`detailed`), × 1.5, rounded. Full table in BUDGETS.md.
 */
const GLOB_BUDGET_BYTES: Readonly<Record<"summary" | "detailed", number>> = {
  summary: 34_000,
  detailed: 310_000,
};

/**
 * The ceiling on ONE `graph inspect` of a block, in bytes, per level.
 *
 * **Derived from measurement, 2026-09-17**, over every block the shipped pack
 * lists: 5,785 bytes at `summary`, 20,551 at `standard`, 72,258 at `detailed`;
 * × 1.5, rounded. `detailed` is the uncut neighbourhood by design, so its
 * ceiling records a size rather than enforcing a cut; `summary` and `standard`
 * are the levels the outbound cap holds (the global Button read 28,713 at
 * `standard` before it, 18,173 after).
 */
const INSPECT_BUDGET_BYTES: Readonly<Record<DetailLevel, number>> = {
  summary: 8_700,
  standard: 31_000,
  detailed: 108_000,
};

/** Every noun with a lookup, derived from the config. */
const NOUNS: readonly string[] = [...declaredStories]
  .filter(([, story]) => story.lookup !== undefined)
  .map(([noun]) => noun);

let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  await rt.store.get();
}, 60_000);
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** The runtime one call at `detail` sees — what `--detail`/`detail` seed. */
const at = (detail: DetailLevel): PragmaRuntime => ({
  ...rt,
  globalFlags: { ...rt.globalFlags, detail },
});

/** Bytes of a value as either machine surface re-serialises it. */
const bytesOf = (value: unknown): number =>
  Buffer.byteLength(JSON.stringify(value));

function verbOf(noun: string, verb: string): VerbSpec {
  const module = storyModules.get(noun) as CapabilityModule;
  const found = module.verbs.find((v) => verbKey(v.path) === `${noun} ${verb}`);
  if (!found) throw new Error(`no compiled "${noun} ${verb}" verb`);
  return found;
}

/**
 * The argument that lifts a tiered noun's scope, and nothing for the rest: the
 * budget is over the whole corpus, not over the default scope's part of it.
 */
const everyTier = (noun: string): Record<string, unknown> =>
  declaredStories.get(noun)?.tierScope ? { tier: "all" } : {};

/** Every entity a noun's lookup can be handed, by IRI (none when it has no list). */
async function population(noun: string): Promise<string[]> {
  if (declaredStories.get(noun)?.list === undefined) return [];
  const page = (await verbOf(noun, "list").run(
    { limit: MAX_LIST_WINDOW, ...everyTier(noun) },
    rt,
  )) as PackPage;
  return [...new Set(page.rows.map((row) => row.uri ?? ""))].filter(Boolean);
}

describe("lookup response budget, shipped pack (PROTECTED)", () => {
  it("derives every lookup from the config", () => {
    expect(NOUNS).toContain("token");
    expect(NOUNS.length).toBeGreaterThanOrEqual(7);
  });

  it.each(
    NOUNS.flatMap((noun) =>
      DETAIL_LEVELS.map((level) => [noun, level] as const),
    ),
  )(
    "%s lookup at %s: the largest entity is inside the budget",
    async (noun, level) => {
      const names = await population(noun);
      expect(names.length).toBeGreaterThan(0);
      const output = (await verbOf(noun, "lookup").run(
        { name: names, ...everyTier(noun) },
        at(level),
      )) as LookupOutput;
      const largest = Math.max(...output.results.map(bytesOf));
      expect(output.errors).toEqual([]);
      expect(largest).toBeLessThanOrEqual(ENTITY_BUDGET_BYTES[level]);
    },
    120_000,
  );

  it.each(
    NOUNS.flatMap((noun) =>
      (["summary", "detailed"] as const).map((level) => [noun, level] as const),
    ),
  )(
    "%s lookup '*' at %s: the widest pattern is cut, and inside the budget",
    async (noun, level) => {
      const verb = verbOf(noun, "lookup");
      const output = (await verb.run(
        { name: ["*"], ...everyTier(noun) },
        at(level),
      )) as LookupOutput;
      const bytes = bytesOf(JSON.parse(verb.output.formatters.json(output)));
      // Cut exactly when there was more than the cap to cut.
      const entities = (await population(noun)).length;
      expect(output.truncated === true).toBe(entities > GLOB_EXPANSION_CAP);
      expect(output.results.length).toBe(
        Math.min(entities, GLOB_EXPANSION_CAP),
      );
      expect(bytes).toBeLessThanOrEqual(GLOB_BUDGET_BYTES[level]);
    },
    120_000,
  );
});

describe("graph inspect response budget, shipped pack (PROTECTED)", () => {
  const inspect = graphModule.verbs.find(
    (v) => verbKey(v.path) === "graph inspect",
  ) as VerbSpec;

  it.each(DETAIL_LEVELS.map((level) => [level] as const))(
    "at %s: the largest block neighbourhood is inside the budget",
    async (level) => {
      const blocks = await population("block");
      expect(blocks.length).toBeGreaterThan(0);
      let largest = 0;
      for (const uri of blocks) {
        const result = await inspect.run({ uri }, at(level));
        largest = Math.max(
          largest,
          bytesOf(JSON.parse(inspect.output.formatters.json(result as never))),
        );
      }
      expect(largest).toBeLessThanOrEqual(INSPECT_BUDGET_BYTES[level]);
    },
    120_000,
  );
});
