/**
 * Filters, search and pagination compiled into the query, EXECUTED against the
 * shipped pack, for every list-shaped body the distribution declares
 * (PROTECTED).
 *
 * The kernel change these assertions guard moved a story's declared filters from
 * a predicate over returned rows into the generated SPARQL, and gave every
 * list-shaped verb a page applied inside that same query. Both halves are
 * semantics claims about a corpus, so a fixture cannot falsify them: a fixture
 * obligingly contains whatever the assertion expects, while the shipped pack
 * contains 252 blocks, 147 standards with a `GROUP_CONCAT`-ed category set, and
 * an ordering with 25 tied names.
 *
 * Four claims, each on the whole corpus rather than a sample:
 *
 * - PAGES PARTITION. Walking a body in small pages returns exactly the rows the
 *   unpaginated read returns, in exactly that order, with exactly those keys.
 *   This is what makes the page a page OF the answer, and it is the assertion
 *   that would catch a store whose sub-select ordering is not stable.
 * - THE QUERY AGREES WITH THE ROW PREDICATE. Every admissible value of every
 *   declared filter, and a search term, answered by the compiled query, equals
 *   what the retired row predicate would have answered over the whole
 *   population — computed here, independently, as the oracle.
 * - A REFUSAL IS STILL A REFUSAL. A value the graph's vocabulary does not admit
 *   is INVALID_INPUT naming the admissible values.
 * - AN EMPTY ANSWER IS STILL CALM. A value the vocabulary admits that no row
 *   carries is an empty page at exit 0, and so is a cursor past the last row.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileStoryModule } from "../kernel/packs/compile.js";
import { MAX_LIST_WINDOW } from "../kernel/packs/paging.js";
import {
  distributionSource,
  type PackFilter,
  type PackList,
  type PackPage,
  type PackRow,
} from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories } from "./distribution.js";

const SOURCE = distributionSource("pragma.conf.ts");

/** One list-shaped body of a declared story, with the verb that runs it. */
interface Body {
  readonly label: string;
  readonly shape: PackList;
  readonly verb: VerbSpec;
}

/**
 * Every list-shaped body the distribution declares — `list` and each extra
 * verb — DERIVED from the config rather than listed, so a story added tomorrow
 * is covered by the author who declares it and without their help.
 */
const BODIES: readonly Body[] = [...declaredStories].flatMap(
  ([noun, story]) => {
    const module = compileStoryModule(story, SOURCE, {});
    const find = (verb: string): VerbSpec => {
      const found = module.verbs.find(
        (v) => verbKey(v.path) === `${noun} ${verb}`,
      );
      if (!found) throw new Error(`no compiled "${noun} ${verb}" verb`);
      return found;
    };
    const bodies: Body[] = [];
    if (story.list) {
      bodies.push({
        label: `${noun} list`,
        shape: story.list,
        verb: find("list"),
      });
    }
    for (const verb of story.verbs ?? []) {
      bodies.push({
        label: `${noun} ${verb.verb}`,
        shape: verb,
        verb: find(verb.verb),
      });
    }
    return bodies;
  },
);

/** Bodies whose story declares at least one filter or a search. */
const NARROWABLE = BODIES.filter(
  (body) => body.shape.filters !== undefined || body.shape.search !== undefined,
);

let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  await rt.store.get();
}, 60_000);

afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** Run one body and return its page. */
const page = (body: Body, params: Record<string, unknown> = {}) =>
  body.verb.run(params, rt) as Promise<PackPage>;

/** Every row of a body, in one call — the population the oracles read. */
async function population(body: Body): Promise<readonly PackRow[]> {
  // The kernel ceiling, which is far above every declared story's row count —
  // so this is the whole answer rather than a page of it, asked for the way a
  // caller who wants everything has to ask.
  return (await page(body, { limit: MAX_LIST_WINDOW })).rows;
}

/** The values a value-free filter's declared vocabulary admits. */
async function vocabulary(filter: PackFilter): Promise<readonly string[]> {
  if (filter.values) return filter.values;
  const declared = filter.vocabulary;
  if (!declared) throw new Error(`filter --${filter.param} declares neither`);
  const result = await rt.query.sparql(declared.query);
  if (result.type !== "select") throw new Error("vocabulary must be a SELECT");
  const variable = declared.variable ?? filter.variable;
  return result.bindings
    .map((row) => row[variable] ?? "")
    .filter((value) => value !== "");
}

/**
 * The RETIRED row predicate, reimplemented here as the oracle the compiled
 * query is held to: whole-cell equality for `exact`, membership of a
 * whitespace-separated set for `set`, case-insensitive either way, and a cell
 * that is missing or empty never matches.
 */
function rowPredicate(
  rows: readonly PackRow[],
  filter: PackFilter,
  value: string,
): PackRow[] {
  const wanted = value.normalize("NFC").toLowerCase();
  return rows.filter((row) => {
    const cell = row[filter.variable];
    if (cell === undefined || cell === "") return false;
    const normalized = cell.normalize("NFC").toLowerCase();
    return filter.match === "set"
      ? normalized.split(/\s+/).includes(wanted)
      : normalized === wanted;
  });
}

/** The retired search predicate, likewise. */
function searchPredicate(
  rows: readonly PackRow[],
  variables: readonly string[],
  term: string,
): PackRow[] {
  const wanted = term.normalize("NFC").toLowerCase();
  return rows.filter((row) =>
    variables.some((variable) =>
      row[variable]?.normalize("NFC").toLowerCase().includes(wanted),
    ),
  );
}

describe("pages partition the answer, whole corpus (PROTECTED)", () => {
  it("derives every list-shaped body from the config", () => {
    // A guard, not a no-op: an empty derivation would make every sweep below
    // vacuously green.
    expect(BODIES.map((body) => body.label)).toContain("standard list");
    expect(BODIES.length).toBeGreaterThanOrEqual(9);
  });

  it.each(BODIES.map((body) => [body.label, body] as const))(
    "%s: a paged walk is the unpaginated answer, in order",
    async (_label, body) => {
      const whole = await population(body);
      const walked: PackRow[] = [];
      let after: string | undefined;
      // Deliberately not a divisor of any story's row count, so the last page
      // is a partial one and the walk has to notice it is the last.
      const limit = 7;
      for (let guard = 0; guard < 500; guard += 1) {
        const current: PackPage = await page(body, {
          limit,
          ...(after ? { after } : {}),
        });
        expect(current.rows.length).toBeLessThanOrEqual(limit);
        walked.push(...current.rows);
        if (current.nextAfter === undefined) break;
        after = current.nextAfter;
      }
      // Byte-identical, keys included: a row's shape is part of the answer, and
      // the generated wrapper projects the author's own variables in the
      // author's own order precisely so it stays so.
      expect(JSON.stringify(walked)).toBe(JSON.stringify(whole));
    },
    60_000,
  );

  it("standard list: a cursor past the last row is a calm empty page", async () => {
    const body = BODIES.find((b) => b.label === "standard list");
    if (!body) throw new Error("no standard list");
    const whole = await population(body);
    const limit = whole.length - 1;
    const first = await page(body, { limit });
    expect(first.nextAfter).toBeTypeOf("string");
    const last = await page(body, { limit, after: first.nextAfter });
    // The tail, then nothing — and nothing is a success, not an error.
    expect(last.rows).toHaveLength(1);
    expect(last.nextAfter).toBeUndefined();
  }, 60_000);
});

describe("the compiled query agrees with the retired row predicate (PROTECTED)", () => {
  it("has a narrowable body to sweep", () => {
    expect([...NARROWABLE.map((body) => body.label)].sort()).toEqual([
      "concept list",
      "implementation list",
      "standard list",
    ]);
  });

  it.each(NARROWABLE.map((body) => [body.label, body] as const))(
    "%s: every admissible filter value answers what the row predicate would",
    async (_label, body) => {
      const whole = await population(body);
      for (const filter of body.shape.filters ?? []) {
        const admissible = await vocabulary(filter);
        expect(admissible.length).toBeGreaterThan(0);
        for (const value of admissible) {
          const answered = await page(body, {
            [filter.param]: value,
            limit: MAX_LIST_WINDOW,
          });
          expect(JSON.stringify(answered.rows)).toBe(
            JSON.stringify(rowPredicate(whole, filter, value)),
          );
        }
      }
    },
    120_000,
  );

  it.each(NARROWABLE.map((body) => [body.label, body] as const))(
    "%s: a search term answers what the row predicate would",
    async (_label, body) => {
      const search = body.shape.search;
      if (!search) return;
      const whole = await population(body);
      for (const term of ["a", "Button", "TEST"]) {
        const answered = await page(body, {
          search: term,
          limit: MAX_LIST_WINDOW,
        });
        expect(JSON.stringify(answered.rows)).toBe(
          JSON.stringify(searchPredicate(whole, search.variables, term)),
        );
      }
    },
    120_000,
  );

  it("standard list: a repeated filter is a union, without duplicating a row", async () => {
    const body = BODIES.find((b) => b.label === "standard list");
    if (!body) throw new Error("no standard list");
    const whole = await population(body);
    const filter = body.shape.filters?.[0];
    if (!filter) throw new Error("no category filter");
    const answered = await page(body, {
      [filter.param]: ["testing", "react"],
      limit: MAX_LIST_WINDOW,
    });
    const union = whole.filter(
      (row) =>
        rowPredicate([row], filter, "testing").length > 0 ||
        rowPredicate([row], filter, "react").length > 0,
    );
    expect(JSON.stringify(answered.rows)).toBe(JSON.stringify(union));
    // The case a `VALUES` block joined into the group would get wrong: a
    // standard filed under a `testing` descendant AND under `react` would come
    // back twice.
    expect(new Set(answered.rows.map((row) => row.uri)).size).toBe(
      answered.rows.length,
    );
  }, 60_000);

  it("standard list: two filters are a conjunction, narrowing each other", async () => {
    const body = BODIES.find((b) => b.label === "implementation list");
    if (!body) throw new Error("no implementation list");
    const whole = await population(body);
    const [first, second] = body.shape.filters ?? [];
    if (!first || !second) throw new Error("expected two filters");
    const a = (await vocabulary(first))[0] as string;
    const b = (await vocabulary(second))[0] as string;
    const answered = await page(body, {
      [first.param]: a,
      [second.param]: b,
      limit: MAX_LIST_WINDOW,
    });
    expect(JSON.stringify(answered.rows)).toBe(
      JSON.stringify(rowPredicate(rowPredicate(whole, first, a), second, b)),
    );
  }, 60_000);
});

describe("a refusal and a calm empty answer stay distinguishable (PROTECTED)", () => {
  it.each(NARROWABLE.map((body) => [body.label, body] as const))(
    "%s: a value the vocabulary does not admit is INVALID_INPUT, naming the ones it does",
    async (_label, body) => {
      for (const filter of body.shape.filters ?? []) {
        const admissible = await vocabulary(filter);
        await expect(
          page(body, { [filter.param]: "zzz-definitely-not-a-value" }),
        ).rejects.toMatchObject({
          code: "INVALID_INPUT",
          validOptions: [...admissible].sort(),
        });
      }
    },
    60_000,
  );

  it("a value the vocabulary admits that no row carries is an empty page, not an error", async () => {
    // The case that separates "the graph is the vocabulary" from "the returned
    // rows are the vocabulary", found in the corpus rather than named: today it
    // is a `ds:ConceptType` the ontology declares and no concept uses. Under
    // the retired rows-as-vocabulary fallback such a value was INVALID_INPUT;
    // under a PAGE it would have been INVALID_INPUT for merely sorting outside
    // the window. It is neither — it is the empty answer the graph actually has.
    const unpopulated: { body: Body; param: string; value: string }[] = [];
    for (const body of NARROWABLE) {
      const whole = await population(body);
      for (const filter of body.shape.filters ?? []) {
        for (const value of await vocabulary(filter)) {
          if (rowPredicate(whole, filter, value).length === 0) {
            unpopulated.push({ body, param: filter.param, value });
          }
        }
      }
    }
    expect(unpopulated.length).toBeGreaterThan(0);
    for (const { body, param, value } of unpopulated) {
      const answered = await page(body, { [param]: value });
      expect(answered.rows).toEqual([]);
      expect(answered.nextAfter).toBeUndefined();
      // And the calm sentence rides the same seam it always did.
      expect(body.verb.output.formatters.notice?.(answered as never)).toContain(
        "entries found.",
      );
    }
  }, 120_000);
});
