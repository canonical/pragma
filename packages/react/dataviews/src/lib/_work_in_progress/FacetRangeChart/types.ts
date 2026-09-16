import type {
  DataViewsMessages,
  DataViewsProvider,
  DisplayStatus,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ComponentProps, ReactNode } from "react";

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider whose source measures the field's range. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /**
   * The number field whose lowest and highest values are drawn: one the
   * source facets as a range and the provider asks it for.
   */
  readonly field: string;
  /** The chart's caption and the stem of its accessible name. */
  readonly label: string;
  /**
   * Replaces the default text of a status shown in place of the range while
   * no result answers the query. The status is the core's, as the table's is.
   */
  readonly renderStatus?: (status: DisplayStatus) => ReactNode;
  /**
   * The words the chart renders, over English. A standalone chart is its own
   * root and takes them here; the connected chart takes its root's.
   */
  readonly messages?: Partial<DataViewsMessages>;
};

/**
 * FacetRangeChart props. The root is a `figure` captioned by `label`, so it
 * extends native figure props, less `children`, since what it holds is drawn
 * from the facet, and `aria-labelledby`, which the caption sets.
 *
 * @experimental Pre-release: a work-in-progress prototype, not admitted to
 * the package root; its shape may change or it may be withdrawn.
 */
export type FacetRangeChartProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = OwnProps<TFields, TRow> &
  Omit<
    ComponentProps<"figure">,
    | keyof OwnProps<TFields, TRow>
    | "children"
    | "aria-busy"
    | "aria-label"
    | "aria-labelledby"
  >;
