import type {
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ComponentProps } from "react";

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider created by `createDataViewsProvider` whose window the bar pages. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /** The navigation's accessible name. Defaults to "Pagination". */
  readonly label?: string;
  /**
   * The page sizes offered; 50, 75 and 100 by default. The applied size is
   * always among them, so the control can never misreport the window it is
   * describing.
   */
  readonly sizes?: readonly number[];
};

/**
 * Props of the pagination bar. The root is a `nav`, so it extends native nav
 * props. `children` is excluded: the bar's contents are derived from the
 * window and what the source can count. So are `role`, which would override
 * the nav's `navigation` role, and `aria-label` and `aria-labelledby`, which
 * would override the name it takes from `label`.
 */
export type PaginationBarProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = OwnProps<TFields, TRow> &
  Omit<
    ComponentProps<"nav">,
    | keyof OwnProps<TFields, TRow>
    | "children"
    | "role"
    | "aria-label"
    | "aria-labelledby"
  >;
