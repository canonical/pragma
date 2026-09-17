/**
 * A cell may declare the noun its values name (`noun: "token"`). Two promises
 * follow, held over the distribution's own stories (PROTECTED):
 *
 * - DECLARED (storeless): when a cell of noun A names noun B, a cell of B names
 *   A, or a table of A's can be filtered by B; and a list column naming a noun
 *   carries a filter of that noun over itself.
 * - SHIPPED (embedded pack, whole corpus): every value such a cell prints
 *   resolves through the resolver a noun filter uses.
 *
 * A cell that declares no `noun` is unseen. Each half has a negative control.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileStoryModule } from "../kernel/packs/compile.js";
import { MAX_LIST_WINDOW } from "../kernel/packs/paging.js";
import {
  type LookupOutput,
  listEntityNames,
  resolveEntityIris,
} from "../kernel/packs/resolveEntity.js";
import { nounsNamed } from "../kernel/packs/storyRules.js";
import {
  distributionSource,
  isNestedExpand,
  type NounLookups,
  type PackCellLink,
  type PackDefinition,
  type PackEntity,
  type PackList,
  type PackPage,
} from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { CapabilityModule } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories } from "./distribution.js";

const SOURCE = distributionSource("pragma.conf.ts");

type Stories = ReadonlyMap<string, PackDefinition>;

/** One list-shaped body of a story, labelled as a caller would type it. */
interface Body {
  readonly noun: string;
  readonly verb: string;
  readonly shape: PackList;
}

const bodiesOf = (stories: Stories): Body[] =>
  [...stories].flatMap(([noun, story]) => [
    ...(story.list ? [{ noun, verb: "list", shape: story.list }] : []),
    ...(story.verbs ?? []).map((verb) => ({
      noun,
      verb: verb.verb,
      shape: verb,
    })),
  ]);

/** A lookup cell that names a noun: where its value sits on an entity. */
interface LookupCell {
  readonly noun: string;
  readonly names: string;
  /** The expand holding it, absent for a field or section. */
  readonly expand?: string;
  readonly field: string;
}

const lookupCellsOf = (stories: Stories): LookupCell[] =>
  [...stories].flatMap(([noun, story]) => {
    const lookup = story.lookup;
    if (!lookup) return [];
    const named = (cell: PackCellLink): cell is { noun: string } =>
      cell.noun !== undefined;
    return [
      ...[...(lookup.fields ?? []), ...(lookup.sections ?? [])]
        .filter(named)
        .map((cell) => ({ noun, names: cell.noun, field: cell.name })),
      ...(lookup.expand ?? []).flatMap((expand) =>
        expand.select.flatMap((entry) =>
          isNestedExpand(entry) || !named(entry)
            ? []
            : [
                {
                  noun,
                  names: entry.noun,
                  expand: expand.name,
                  field: entry.name,
                },
              ],
        ),
      ),
    ];
  });

/** Every declared link that has no way back, and every unfilterable column. */
function linkViolations(stories: Stories): string[] {
  const bodies = bodiesOf(stories);
  const links = [
    ...lookupCellsOf(stories).map((cell) => ({
      from: cell.noun,
      to: cell.names,
      at: `${cell.noun} lookup ${cell.expand ?? ""}.${cell.field}`,
    })),
    ...bodies.flatMap((body) =>
      body.shape.columns.flatMap((column) =>
        column.noun
          ? [
              {
                from: body.noun,
                to: column.noun,
                at: `${body.noun} ${body.verb} ${column.field}`,
              },
            ]
          : [],
      ),
    ),
  ];
  /** Whether some table of `of`'s entities takes a filter naming `by`. */
  const filterable = (of: string, by: string): boolean =>
    bodies
      .filter(
        (body) =>
          (body.noun === of && body.verb === "list") ||
          body.shape.columns.some((column) => column.noun === of),
      )
      .some((body) => body.shape.filters?.some((f) => f.noun === by));

  const oneWay = links
    .filter((link) => link.from !== link.to)
    .filter(
      (link) =>
        !links.some((back) => back.from === link.to && back.to === link.from) &&
        !filterable(link.from, link.to),
    )
    .map((link) => `${link.at} names a ${link.to}, with no way back`);
  const unfilterable = bodies.flatMap((body) =>
    body.shape.columns
      .filter(
        (column) =>
          column.noun !== undefined &&
          !body.shape.filters?.some(
            (f) => f.noun === column.noun && f.variable === column.field,
          ),
      )
      .map(
        (column) =>
          `${body.noun} ${body.verb} lists a ${column.noun} in "${column.field}" it cannot be filtered by`,
      ),
  );
  const unknown = [...stories].flatMap(([noun, story]) =>
    nounsNamed(story)
      .filter((named) => !stories.get(named)?.lookup)
      .map((named) => `${noun} names a ${named}, which has no lookup`),
  );
  return [...oneWay, ...unfilterable, ...unknown];
}

/** A value a `noun` cell printed, and where. */
interface Printed {
  readonly at: string;
  readonly names: string;
  readonly value: string;
}

/** Every value every `noun` cell prints, over each story's whole corpus. */
async function printedNames(
  rt: PragmaRuntime,
  stories: Stories,
): Promise<Printed[]> {
  const nouns: NounLookups = (noun) => stories.get(noun)?.lookup;
  const modules = new Map<string, CapabilityModule>(
    [...stories].map(([noun, story]) => [
      noun,
      compileStoryModule(story, SOURCE, {}, nouns),
    ]),
  );
  const run = (noun: string, verb: string, params: Record<string, unknown>) => {
    const found = modules
      .get(noun)
      ?.verbs.find((v) => verbKey(v.path) === `${noun} ${verb}`);
    if (!found) throw new Error(`no compiled "${noun} ${verb}" verb`);
    return found.run(params, rt);
  };
  const everyTier = (noun: string) =>
    stories.get(noun)?.tierScope ? { tier: "all" } : {};
  const printed = new Map<string, Printed>();
  const record = (at: string, names: string, value: unknown) => {
    if (typeof value !== "string" || value === "") return;
    printed.set(`${at}\n${value}`, { at, names, value });
  };

  for (const body of bodiesOf(stories)) {
    const columns = body.shape.columns.filter((column) => column.noun);
    if (columns.length === 0) continue;
    let after: string | undefined;
    do {
      const page = (await run(body.noun, body.verb, {
        limit: MAX_LIST_WINDOW,
        ...everyTier(body.noun),
        ...(after ? { after } : {}),
      })) as PackPage;
      for (const row of page.rows) {
        for (const column of columns) {
          record(
            `${body.noun} ${body.verb} ${column.field}`,
            column.noun as string,
            row[column.field],
          );
        }
      }
      after = page.nextAfter;
    } while (after !== undefined);
  }

  const cells = lookupCellsOf(stories);
  for (const noun of new Set(cells.map((cell) => cell.noun))) {
    const lookup = stories.get(noun)?.lookup;
    if (!lookup) continue;
    const names = await listEntityNames(rt, lookup, SOURCE);
    if (names.length === 0) continue;
    const output = (await run(noun, "lookup", {
      name: names,
      ...everyTier(noun),
    })) as LookupOutput;
    for (const entity of output.results as PackEntity[]) {
      for (const cell of cells.filter((c) => c.noun === noun)) {
        const at = `${noun} lookup ${cell.expand ?? ""}.${cell.field}`;
        const held = cell.expand ? entity[cell.expand] : [entity];
        for (const row of Array.isArray(held) ? held : []) {
          record(at, cell.names, (row as Record<string, unknown>)[cell.field]);
        }
      }
    }
  }
  return [...printed.values()];
}

/**
 * The printed values the named noun cannot resolve, through the resolver a
 * noun filter uses. A cell is one name, or a space-separated set of names (a
 * `many` cell).
 */
async function unresolved(
  rt: PragmaRuntime,
  stories: Stories,
  printed: readonly Printed[],
): Promise<string[]> {
  const answers = new Map<string, Promise<boolean>>();
  const resolves = (noun: string, value: string): Promise<boolean> => {
    const key = `${noun}\n${value}`;
    const lookup = stories.get(noun)?.lookup;
    const answer =
      answers.get(key) ??
      (lookup
        ? resolveEntityIris(rt, lookup, noun, [value], SOURCE, {}).then(
            (iris) => iris.length > 0,
            () => false,
          )
        : Promise.resolve(false));
    answers.set(key, answer);
    return answer;
  };
  const missing: string[] = [];
  for (const cell of printed) {
    const members = cell.value.split(/\s+/);
    const found =
      (await resolves(cell.names, cell.value)) ||
      (members.length > 1 &&
        (await Promise.all(members.map((m) => resolves(cell.names, m)))).every(
          Boolean,
        ));
    if (!found) missing.push(`${cell.at}: "${cell.value}" is no ${cell.names}`);
  }
  return missing;
}

describe("a declared link has a way back (PROTECTED)", () => {
  it("derives links from the config", () => {
    // A guard, not a no-op: no annotated cell would make the rule vacuous.
    const nouns = new Set(lookupCellsOf(declaredStories).map((c) => c.names));
    expect([...nouns].sort()).toEqual([
      "block",
      "modifier",
      "token",
      "variable",
    ]);
  });

  it("every cell naming another noun can be followed back, and every such column filtered", () => {
    expect(linkViolations(declaredStories)).toEqual([]);
  });

  it("negative control: a one-way link and an unfilterable column are both named", () => {
    const stories: Stories = new Map(
      [
        WIDGET,
        { noun: "maker", lookup: { by: "ex:name", type: "ex:Maker" } },
      ].map((story) => [story.noun, story]),
    );
    expect(linkViolations(stories)).toEqual([
      "widget list maker names a maker, with no way back",
      'widget list lists a maker in "maker" it cannot be filtered by',
    ]);
  });
});

describe("every printed link resolves, whole corpus (PROTECTED)", () => {
  let rt: PragmaRuntime;
  beforeAll(async () => {
    rt = bootRuntime(TEST_FLAGS);
    await rt.store.get();
  }, 60_000);
  afterAll(async () => {
    (await rt.store.get()).store.dispose();
  });

  it("every value a noun cell prints is a name that noun's lookup resolves", async () => {
    const printed = await printedNames(rt, declaredStories);
    // Each annotated cell printed something: a cell that printed nothing
    // would pass by saying nothing.
    const silent = [
      ...lookupCellsOf(declaredStories).map(
        (cell) => `${cell.noun} lookup ${cell.expand ?? ""}.${cell.field}`,
      ),
      ...bodiesOf(declaredStories).flatMap((body) =>
        body.shape.columns
          .filter((column) => column.noun)
          .map((column) => `${body.noun} ${body.verb} ${column.field}`),
      ),
    ].filter((at) => !printed.some((cell) => cell.at === at));
    expect(silent).toEqual([]);
    expect(await unresolved(rt, declaredStories, printed)).toEqual(
      UNRESOLVED_TODAY,
    );
  }, 300_000);

  it("negative control: a cell printing a name its noun cannot resolve is named", async () => {
    const { rt: fixture } = await buildFixtureRuntime({
      ttl: TTL,
      prefixes: PREFIXES,
    });
    const stories: Stories = new Map(
      [
        WIDGET,
        { noun: "maker", lookup: { by: "ex:name", type: "ex:Maker" } },
      ].map((story) => [story.noun, story]),
    );
    const printed = await printedNames(fixture, stories);
    expect(await unresolved(fixture, stories, printed)).toEqual([
      'widget list maker: "anon" is no maker',
    ]);
  }, 60_000);
});

/**
 * The printed names their noun cannot resolve TODAY — asserted exactly, so an
 * entry goes red the day it is fixed and cannot outlive its reason.
 *
 * `KeyboardKeys` is a `ds:Group`: a kind of block the design system defines,
 * one of which records token bindings, and which the block story does not
 * address — so `token consumers` prints a block that `block lookup` and
 * `--block` both miss.
 */
const UNRESOLVED_TODAY: readonly string[] = [
  'token consumers block: "KeyboardKeys" is no block',
];

const PREFIXES = { ex: "https://example.org/shop#" };

/** Two widgets; one maker carries no name, so its cell falls back to the IRI. */
const TTL = `
@prefix ex: <https://example.org/shop#> .
ex:acme a ex:Maker ; ex:name "Acme" .
ex:anon a ex:Maker .
ex:button a ex:Widget ; ex:name "Button" ; ex:madeBy ex:acme .
ex:label a ex:Widget ; ex:name "Label" ; ex:madeBy ex:anon .
`;

/** Names a maker in a column with no filter, and nothing of a maker's names it. */
const WIDGET: PackDefinition = {
  noun: "widget",
  list: {
    query: [
      "SELECT ?uri ?name ?maker WHERE {",
      "  ?uri a ex:Widget ; ex:name ?name ; ex:madeBy ?makerUri .",
      "  OPTIONAL { ?makerUri ex:name ?makerName }",
      '  BIND(COALESCE(?makerName, REPLACE(STR(?makerUri), "^.*#", "")) AS ?maker)',
      "} ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "name", label: "Name" },
      { field: "maker", label: "Maker", noun: "maker" },
    ],
  },
};
