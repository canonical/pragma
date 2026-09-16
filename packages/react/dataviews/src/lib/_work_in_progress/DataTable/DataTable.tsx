import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { Announcer } from "../../common/index.js";
import { useAnnouncer, useMessages } from "../../hooks/index.js";
import { ScopedDataTable } from "./common/ScopedDataTable/index.js";
import type { DataTableProps } from "./types.js";
import "./styles.css";

/**
 * DataTable renders the rows of one collection.
 *
 * It renders rows and nothing else: it does not fetch, own the URL or decide
 * where views persist — it observes its provider, which does. The provider
 * is explicit, so the same table works standalone and inside a DataViews
 * root, and never changes behaviour because some optional context happened
 * to be present.
 *
 * Its rows are divs consuming one shared track list, published once on the
 * container as a custom property. Fixed columns keep their declared width,
 * flexible ones compress within their bounds, the last column takes whatever
 * width the others leave, and the container scrolls when the remainder no
 * longer fits — there is no automatic hiding, pairing or renderer switching.
 * The selection column is not among them: its width is the stylesheet's,
 * and the columns share what it leaves. Which columns show, in what order
 * and at what width is the provider's presentation: the table renders the
 * arrangement in force and writes a resize back to it, so every table on
 * one provider agrees.
 *
 * A column marked `sortable` sorts from its header: activating it cycles
 * ascending, descending and back to the source's own order, and Shift adds
 * a further term where the source orders by more than one. The headers show
 * the ordering in force — the source's default when the query states none
 * — and exactly one of them, the first term's, carries `aria-sort`. Without
 * scripting each sortable header is a real link to the next ordering, from
 * the first page, where the provider has a location to lead to; once
 * scripts run, a menu beside each header sorts ascending or descending, or
 * removes the column from the reader's ordering, where it offers sorting,
 * and hides the column or moves it left or right.
 *
 * Given `DataViews.Settings` as its `settings`, the header ends in a settings
 * cell holding it: a menu hiding, showing and moving each column, and
 * resetting the table's settings. Each change is written to the
 * presentation and asks the source for nothing.
 *
 * Every word it renders comes from `messages`, over English. A standalone
 * table is its own root: it announces politely, through one live region of
 * its own after the table, what an activation or a change to its columns
 * did — the new ordering, why a sort changed nothing, a column hidden, shown
 * or moved with where it now stands. Inside a DataViews root, the connected
 * table speaks through the root's instead.
 *
 * Given `virtualization`, it mounts only the rows near its viewport and reports
 * every row's logical position; without it, every row is rendered.
 *
 * `import { DataTable } from "@canonical/dataviews-react";`
 *
 * @implements ds:apps.pattern.data_table
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function DataTable<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({ messages, ...props }: DataTableProps<TFields, TRow>): ReactElement {
  const words = useMessages(messages);
  const { ref, announce } = useAnnouncer();
  return (
    <>
      <ScopedDataTable {...props} messages={words} announce={announce} />
      {/* Beside the table rather than in it: a table's children are its row
          groups. */}
      <Announcer ref={ref} />
    </>
  );
}
