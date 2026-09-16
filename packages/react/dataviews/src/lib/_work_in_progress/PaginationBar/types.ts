import type {
  DataViewsMessages,
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { LinkComponent } from "@canonical/react-ds-global";
import type { ComponentProps } from "react";

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider created by `createDataViewsProvider` whose window the bar pages. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /**
   * The words the bar renders, over the English record: a standalone bar is
   * its own root. The connected bar takes its root's instead. Define a
   * worded message once: a new function on every render re-renders the bar.
   */
  readonly messages?: Partial<DataViewsMessages>;
  /** The navigation's accessible name. Defaults to the messages' `pagination`. */
  readonly label?: string;
  /**
   * The page sizes offered; 50, 75 and 100 by default. The applied size is
   * always among them, so the control can never misreport the window it is
   * describing.
   */
  readonly sizes?: readonly number[];
  /**
   * Router integration for the page links, against the design system's
   * shared link contract. Defaults to `"a"`, where a plain click is
   * intercepted and pages in place; a router's `Link` navigates itself, and
   * the provider hears the move through its location port — the router's
   * own navigation then decides how the move enters history.
   */
  readonly LinkComponent?: LinkComponent;
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
