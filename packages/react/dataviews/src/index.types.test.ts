/**
 * Compile-time contract tests for the package's public type surface: every
 * exported type is reachable through the barrel, and the connected parts'
 * props take their root's native props except the ones each part derives.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DataTableCellProps,
  DataTableColumn,
  DataTableProps,
  DataTableStatus,
  DataTableWindowing,
  DataViewsActionsProps,
  DataViewsDataTableProps,
  DataViewsFiltersProps,
  DataViewsPaginationProps,
  DataViewsProps,
  DataViewsViewsProps,
  PaginationBarProps,
  UseDataViewsCellResult,
  UseDataViewsFieldResult,
  UseDataViewsResult,
} from "./index.js";
import type { VirtualRowsConfig } from "./lib/virtualization/index.js";
import { virtualRows } from "./lib/virtualization/index.js";

type Fields = readonly SchemaFieldDefinition[];

/** Every type the package root re-exports, as one enumerable tuple. */
type EveryPublicType = [
  DataViewsActionsProps,
  DataViewsDataTableProps<Fields>,
  DataTableCellProps,
  DataTableColumn,
  DataTableProps<Fields>,
  DataTableStatus,
  DataTableWindowing,
  DataViewsProps<Fields>,
  DataViewsFiltersProps,
  PaginationBarProps<Fields>,
  DataViewsPaginationProps,
  UseDataViewsCellResult,
  UseDataViewsFieldResult<unknown>,
  UseDataViewsResult<Fields>,
  DataViewsViewsProps,
];

/** Every type name one barrel puts on the surface, following its re-exports. */
const surfaceOf = (barrel: string): string[] => {
  const text = readFileSync(barrel, "utf8");
  const from = (spec: string): string =>
    path.join(path.dirname(barrel), spec.replace(/\.js$/, ".ts"));
  const names: string[] = [];
  for (const [, spec] of text.matchAll(/^export \* from "([^"]+)";/gm)) {
    names.push(...surfaceOf(from(spec)));
  }
  for (const [, spec] of text.matchAll(/^export type \* from "([^"]+)";/gm)) {
    names.push(
      ...[
        ...readFileSync(from(spec), "utf8").matchAll(
          /^export (?:type|interface) (\w+)/gm,
        ),
      ].map(([, name]) => name),
    );
  }
  for (const [, list] of text.matchAll(
    /^export type \{([^}]*)\} from "[^"]+";/gms,
  )) {
    for (const entry of list.split(",")) {
      const name = entry
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name !== undefined && name !== "") {
        names.push(name);
      }
    }
  }
  return names;
};

/** The names this file pins, read from its own import of the barrel. */
const pinned = (): string[] => {
  // Resolved from the package root, which is where the suite runs: the
  // module's own URL is not a file URL in every project this runs under.
  const text = readFileSync(path.resolve("src/index.types.test.ts"), "utf8");
  const block = text.match(/import type \{([^}]*)\} from "\.\/index\.js";/s);
  if (block === null) {
    throw new Error("this file must import its pins from the barrel");
  }
  return block[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
};

describe("public surface types", () => {
  it("re-exports the full type surface from the barrel", () => {
    // The import above is checked by the compiler, so a name that leaves
    // the barrel fails to compile. This is the other direction: a name that
    // *enters* it without a decision, which no type assertion can catch.
    const surface = [
      ...new Set(surfaceOf(path.resolve("src/lib/index.ts"))),
    ].sort();
    expect(surface).toEqual(pinned().sort());
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<15>();
  });
});

describe("the windowing prop", () => {
  it("takes the descriptor virtualRows makes, and only that", () => {
    expectTypeOf(
      virtualRows({ estimatedRowHeight: 40 }),
    ).toEqualTypeOf<DataTableWindowing>();
    expectTypeOf<
      DataTableProps<Fields, RowRecord>["windowing"]
    >().toEqualTypeOf<DataTableWindowing | undefined>();
    // What a descriptor carries is keyed by a symbol no entry point
    // exports, so a descriptor has nothing to read and cannot be written
    // by hand.
    expectTypeOf<DataTableWindowing>().not.toHaveProperty("estimatedRowHeight");
    expectTypeOf<{
      readonly estimatedRowHeight: number;
    }>().not.toExtend<DataTableWindowing>();
    expectTypeOf<VirtualRowsConfig>().toEqualTypeOf<{
      readonly estimatedRowHeight: number;
    }>();
  });
});

describe("the pagination bar's props", () => {
  it("requires the provider it pages and derives its contents", () => {
    expectTypeOf<PaginationBarProps<Fields>>()
      .toHaveProperty("provider")
      .not.toBeNullable();
    expectTypeOf<PaginationBarProps<Fields>>().not.toHaveProperty("children");
    expectTypeOf<PaginationBarProps<Fields>>().not.toHaveProperty("role");
    expectTypeOf<PaginationBarProps<Fields>>().not.toHaveProperty("aria-label");
  });

  it("is the connected part's props with the provider", () => {
    // The connected part is the same bar; only its provider's source differs.
    expectTypeOf<DataViewsPaginationProps>().not.toHaveProperty("provider");
    expectTypeOf<
      Omit<PaginationBarProps<Fields>, "provider">
    >().toEqualTypeOf<DataViewsPaginationProps>();
  });
});

describe("connected part props", () => {
  it("keeps what Filters derives out of its props", () => {
    // Its controls come from the provider, its name from its legend and the
    // fieldset's group role is its own.
    expectTypeOf<DataViewsFiltersProps>().not.toHaveProperty("children");
    expectTypeOf<DataViewsFiltersProps>().not.toHaveProperty("role");
    expectTypeOf<DataViewsFiltersProps>().not.toHaveProperty("aria-label");
    expectTypeOf<DataViewsFiltersProps>().not.toHaveProperty("aria-labelledby");
    expectTypeOf<DataViewsFiltersProps>().toHaveProperty("disabled");
  });

  it("keeps what Pagination derives out of its props", () => {
    expectTypeOf<DataViewsPaginationProps>().not.toHaveProperty("children");
    expectTypeOf<DataViewsPaginationProps>().not.toHaveProperty("role");
    expectTypeOf<DataViewsPaginationProps>().not.toHaveProperty("aria-label");
    expectTypeOf<DataViewsPaginationProps>().not.toHaveProperty(
      "aria-labelledby",
    );
    expectTypeOf<DataViewsPaginationProps>().toHaveProperty("id");
  });

  it("keeps what Actions derives out of its props", () => {
    // Its name comes from its label and the group role is its own; its
    // children are the caller's actions.
    expectTypeOf<DataViewsActionsProps>().not.toHaveProperty("role");
    expectTypeOf<DataViewsActionsProps>().not.toHaveProperty("aria-label");
    expectTypeOf<DataViewsActionsProps>().not.toHaveProperty("aria-labelledby");
    expectTypeOf<DataViewsActionsProps>().not.toHaveProperty("selection");
    // The bar holds its root to hand the focus back; the caller's own ref
    // is merged with that, never dropped.
    expectTypeOf<DataViewsActionsProps>().toHaveProperty("ref");
    expectTypeOf<DataViewsActionsProps>().toHaveProperty("children");
  });
});
