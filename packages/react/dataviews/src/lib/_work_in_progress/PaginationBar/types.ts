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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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

/** What the pagination bar shows and offers for one collection snapshot. */
export type PaginationState = {
  /** The window's page, counted from one. */
  readonly page: number;
  /** How many rows a page holds. */
  readonly size: number;
  /**
   * How many rows are on screen, or null while those rows do not answer the
   * current query: nothing has arrived yet, a replacement is in flight, or it
   * failed and left an earlier query's rows in view.
   */
  readonly shown: number | null;
  /**
   * How many rows the window pages over, when the source counts them
   * exactly for this query. A lower bound is not a total and is not one.
   */
  readonly total: number | null;
  /**
   * How many pages the total makes, when the source reaches pages by
   * number and there is a total. Null where no page can be addressed by
   * number: a forward cursor source knowing its own size still cannot be
   * asked for its fifth page.
   */
  readonly pages: number | null;
  /** Whether a later page is known to exist. */
  readonly hasNext: boolean;
  /**
   * Where Previous goes. A page past the last — an old link, a shrunken
   * result — steps back to the last page there is, not one page at a time.
   */
  readonly back: number;
  /**
   * The token the next page starts at, where the source hands tokens back.
   * Null for an offset source, which reaches its pages by number alone.
   */
  readonly nextCursor: string | null;
  /** The token `back` starts at, on a source that pages both ways. */
  readonly backCursor: string | null;
  /** The page sizes offered, each once, always including the applied one. */
  readonly sizes: readonly number[];
};
