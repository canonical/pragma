/**
 * Compile-time contract tests for the package's public type surface: every
 * exported type is reachable through the barrel, and the connected parts'
 * props take their root's native props except the ones each part derives.
 */

import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { describe, expectTypeOf, it } from "vitest";
import type {
  ActionsProps,
  CellScopeValue,
  DataTableCellProps,
  DataTableColumn,
  DataTableProps,
  DataTableStatus,
  DataViewsProps,
  FiltersProps,
  PaginationBarProps,
  PaginationProps,
  UseDataViewsCellResult,
  UseDataViewsFieldResult,
  UseDataViewsResult,
} from "./index.js";

type Fields = readonly SchemaFieldDefinition[];

/** Every type the package root re-exports, as one enumerable tuple. */
type EveryPublicType = [
  ActionsProps,
  CellScopeValue,
  DataTableCellProps,
  DataTableColumn,
  DataTableProps<Fields, RowRecord>,
  DataTableStatus,
  DataViewsProps<Fields>,
  FiltersProps,
  PaginationBarProps<Fields>,
  PaginationProps,
  UseDataViewsCellResult,
  UseDataViewsFieldResult<unknown>,
  UseDataViewsResult<Fields>,
];

describe("public surface types", () => {
  it("re-exports the full type surface from the barrel", () => {
    expectTypeOf<EveryPublicType>().not.toBeAny();
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<13>();
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
    expectTypeOf<PaginationProps>().not.toHaveProperty("provider");
    expectTypeOf<
      Omit<PaginationBarProps<Fields>, "provider">
    >().toEqualTypeOf<PaginationProps>();
  });
});

describe("connected part props", () => {
  it("keeps what Filters derives out of its props", () => {
    // Its controls come from the provider, its name from its legend and the
    // fieldset's group role is its own.
    expectTypeOf<FiltersProps>().not.toHaveProperty("children");
    expectTypeOf<FiltersProps>().not.toHaveProperty("role");
    expectTypeOf<FiltersProps>().not.toHaveProperty("aria-label");
    expectTypeOf<FiltersProps>().not.toHaveProperty("aria-labelledby");
    expectTypeOf<FiltersProps>().toHaveProperty("disabled");
  });

  it("keeps what Pagination derives out of its props", () => {
    expectTypeOf<PaginationProps>().not.toHaveProperty("children");
    expectTypeOf<PaginationProps>().not.toHaveProperty("role");
    expectTypeOf<PaginationProps>().not.toHaveProperty("aria-label");
    expectTypeOf<PaginationProps>().not.toHaveProperty("aria-labelledby");
    expectTypeOf<PaginationProps>().toHaveProperty("id");
  });

  it("keeps what Actions derives out of its props", () => {
    // Its name comes from its label and the group role is its own; its
    // children are the caller's actions.
    expectTypeOf<ActionsProps>().not.toHaveProperty("role");
    expectTypeOf<ActionsProps>().not.toHaveProperty("aria-label");
    expectTypeOf<ActionsProps>().not.toHaveProperty("aria-labelledby");
    expectTypeOf<ActionsProps>().not.toHaveProperty("selection");
    expectTypeOf<ActionsProps>().not.toHaveProperty("ref");
    expectTypeOf<ActionsProps>().toHaveProperty("children");
  });
});
