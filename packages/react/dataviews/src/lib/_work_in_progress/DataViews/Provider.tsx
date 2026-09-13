import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import Context from "./Context.js";
import {
  Actions,
  DataTable,
  Filters,
  Pagination,
  Views,
} from "./common/index.js";
import { useProviderState } from "./hooks/index.js";
import type { DataViewsProps } from "./types.js";

/**
 * The DataViews root: mounts the collection provider's context for the
 * hooks and connected parts of the composition, observes the provider for
 * as long as it is mounted, and owns the filter records its parts edit
 * through.
 *
 * Pure composition — no single root element (AGENTS.md rule 6): the root is
 * a context mount, not a DOM node.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function DataViews<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({ provider, children }: DataViewsProps<TFields, TRow>): ReactElement {
  const value = useProviderState({ provider });
  return <Context value={value}>{children}</Context>;
}

/** The connected action bar, over the current selection. */
DataViews.Actions = Actions;
/** The collection's rows, bound to this root. */
DataViews.DataTable = DataTable;
/** The connected query-editing part of the composition. */
DataViews.Filters = Filters;
/** The connected window-navigation part of the composition. */
DataViews.Pagination = Pagination;
/** The connected saved-view control, over the store the provider was given. */
DataViews.Views = Views;
