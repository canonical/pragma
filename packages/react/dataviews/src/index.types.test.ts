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
  CellScopeValue,
  DataTableCellProps,
  DataTableColumn,
  DataTableProps,
  DataTableStatus,
  DataViewsProps,
  FiltersProps,
  PaginationProps,
  UseDataViewsCellResult,
  UseDataViewsFieldResult,
  UseDataViewsResult,
} from "./index.js";

type Fields = readonly SchemaFieldDefinition[];

/** Every type the package root re-exports, as one enumerable tuple. */
type EveryPublicType = [
  CellScopeValue,
  DataTableCellProps,
  DataTableColumn,
  DataTableProps<Fields, RowRecord>,
  DataTableStatus,
  DataViewsProps<Fields>,
  FiltersProps,
  PaginationProps,
  UseDataViewsCellResult,
  UseDataViewsFieldResult<unknown>,
  UseDataViewsResult<Fields>,
];

describe("public surface types", () => {
  it("re-exports the full type surface from the barrel", () => {
    expectTypeOf<EveryPublicType>().not.toBeAny();
    expectTypeOf<EveryPublicType["length"]>().toEqualTypeOf<11>();
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
});
