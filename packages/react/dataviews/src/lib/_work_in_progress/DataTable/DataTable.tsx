import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  type ColumnToSize,
  createColumnLayout,
  createGridInteraction,
  isIdentity,
  listDisplayEntries,
} from "@canonical/dataviews-core/bindings";
import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useId,
  useMemo,
} from "react";
import { useMergedRef } from "../../hooks/index.js";
import { WINDOWED } from "../../windowing/index.js";
import { useDataViewsValue } from "../DataViews/hooks/index.js";
import areColumnModelsEqual from "./areColumnModelsEqual.js";
import areColumnsEqual from "./areColumnsEqual.js";
import areStatusesEqual from "./areStatusesEqual.js";
import {
  HeaderCell,
  SelectAllCell,
  TableBody,
  type TableBodyProps,
} from "./common/index.js";
import { readBounds, readFieldName, readSizing } from "./common/utils/index.js";
import deriveTableStatus from "./deriveTableStatus.js";
import describeStatus from "./describeStatus.js";
import {
  usePreferredWidths,
  useRowScopes,
  useStableCallback,
  useStableValue,
  useTableGeometry,
} from "./hooks/index.js";
import type { DataTableProps, DataTableWindowing } from "./types.js";
import "./styles.css";

/**
 * `dense` is the design system's own density class: it sets the channel the
 * stylesheet reads for row height and cell padding, so the table is dense
 * wherever it sits.
 */
const componentCssClassName = "ds data-table dense";

/** One identity for a source that orders by nothing. */
const NO_SORTABLE_FIELDS: readonly string[] = Object.freeze([]);

/** A record answers to its own identity until the caller names it better. */
const defaultRowLabel = (_row: object, rowId: string): string => rowId;

/**
 * The body a windowing descriptor carries, given the table's body props and
 * its published tracks, which re-wrap cells when they change.
 */
const windowedRows = <TRow extends object>(
  windowing: DataTableWindowing,
  props: TableBodyProps<TRow>,
  tracks: string | undefined,
): ReactElement => {
  const { body: Body, estimatedRowHeight } = windowing[WINDOWED];
  return (
    <Body {...props} estimatedRowHeight={estimatedRowHeight} tracks={tracks} />
  );
};

/**
 * DataTable renders the rows of one collection.
 *
 * It renders rows and nothing else: it does not fetch, own the URL or decide
 * where views persist. The provider is explicit, so the same table works
 * standalone and inside a DataViews root, and never changes behaviour
 * because some optional context happened to be present.
 *
 * Its rows are divs consuming one shared track list, published once on the
 * container as a custom property. Fixed columns keep their declared width,
 * flexible ones compress within their bounds, the last column takes whatever
 * width the others leave, and the container scrolls when the remainder no
 * longer fits — there is no automatic hiding, pairing or renderer switching.
 * The selection column is not among them: its width is the stylesheet's,
 * and the columns share what it leaves.
 *
 * Given `windowing`, it mounts only the rows near its viewport and reports
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
>({
  provider,
  columns,
  label,
  layout,
  selectable = false,
  rowLabel = defaultRowLabel,
  renderStatus = describeStatus,
  windowing,
  className,
  style,
  ref,
  ...rest
}: DataTableProps<TFields, TRow>): ReactElement {
  if (!isIdentity(provider?.identity)) {
    throw new Error(
      "DataTable requires a provider created by createDataViewsProvider",
    );
  }
  // Sorting is offered from the same declaration Filters reads, so a
  // provider not given one cannot offer it.
  const declared = provider.capabilities;
  if (declared === null && columns.some((column) => column.sortable === true)) {
    throw new Error(
      "DataTable requires a provider given the source's capabilities to offer a sortable column; pass them to createDataViewsProvider",
    );
  }
  const sortableFields =
    declared === null || declared.sort.terms === 0
      ? NO_SORTABLE_FIELDS
      : declared.sort.fields;
  // A set, because the header asks once per column and the table redraws on
  // every frame of a resize. One identity for "nothing is sortable", so the
  // memo holds there too.
  const orderable = useMemo(() => new Set(sortableFields), [sortableFields]);
  const baseId = useId();

  // Both derivations are keyed on content, not on array identity: a caller
  // who rebuilds its column array on every render must not re-mint the
  // layout, the interaction or one row scope, nor re-render one cell.
  // The two keys are separate because they answer different questions — a
  // caller's inline `header` node must not cost anyone a new layout.
  const model = useStableValue(columns, areColumnModelsEqual);
  const rendered = useStableValue(columns, areColumnsEqual);

  const fields = useMemo<readonly string[]>(
    () => model.map(readFieldName),
    [model],
  );
  const declaredTracks = useMemo<readonly ColumnToSize[]>(
    () =>
      model.map((column) => ({ id: column.id, sizing: readSizing(column) })),
    [model],
  );
  const columnIds = useMemo(
    () => declaredTracks.map((track) => track.id),
    [declaredTracks],
  );

  const ownLayout = useMemo(
    () => createColumnLayout(declaredTracks),
    [declaredTracks],
  );
  const activeLayout = layout ?? ownLayout;
  const interaction = useMemo(
    () => createGridInteraction(activeLayout),
    [activeLayout],
  );
  // Subscribed from an effect, never from the render that built it: React
  // may discard a render — StrictMode double-invokes the body, and a
  // concurrent render can be thrown away — and a subscription taken at
  // construction would outlive the interaction nothing else holds.
  useEffect(() => interaction.observe(), [interaction]);
  usePreferredWidths(activeLayout, provider.views);

  const geometry = useTableGeometry(activeLayout, interaction, columnIds);
  const scopes = useRowScopes(provider, fields);
  const state = useDataViewsValue(provider.state);
  // Held at one reference while it says the same thing, so the entries are
  // derived again only when a row identity or the status changes.
  const status = useStableValue(deriveTableStatus(state), areStatusesEqual);
  const ids = useDataViewsValue(scopes.ids);
  // The status row first, then the rows: kept beside a stale status,
  // replaced by any other.
  const entries = useMemo(
    () =>
      listDisplayEntries({
        rowIds:
          status === null ||
          status.status === "stale" ||
          status.status === "refresh-failed"
            ? ids
            : [],
        status,
      }),
    [ids, status],
  );
  const busy =
    state.result.status === "pending" || state.result.status === "refreshing";

  // The container ref is the table's own — the solver measures it — so a
  // caller's ref is merged onto it rather than dropped, as className and
  // style are. The merge holds the caller's ref behind one identity, which
  // matters most here: a ref React re-ran per render would rebuild the
  // resize observer and re-measure the container on every frame of a drag.
  const attach = useMergedRef(ref, geometry.attach);

  // Held behind one identity apiece: the README's own examples pass these
  // as lambdas, and a new function per render would re-render every row
  // and every cell of the body for nothing.
  const nameRow = useStableCallback(rowLabel);
  const showStatus = useStableCallback(renderStatus);

  const body: TableBodyProps<TRow> = {
    provider,
    scopes,
    entries,
    columns: rendered,
    selectable,
    rowLabel: nameRow,
    // While a status shows, the caller's own function, so a new one is
    // shown at once; otherwise the held one, which re-renders nothing.
    renderStatus: status === null ? showStatus : renderStatus,
  };

  // A custom property, which `CSSProperties` does not spell.
  const geometryStyle = {
    ...style,
    "--data-table-columns": geometry.template,
  } as CSSProperties;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <table> resolves each row's widths from its own content, which is exactly what this grid replaces with one shared track list
    <div
      {...rest}
      ref={attach}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={geometryStyle}
      role="table"
      aria-label={label}
      aria-busy={busy}
      // Every logical row, the header's included, so a row a windowed
      // table has not mounted is still counted.
      aria-rowcount={windowing === undefined ? undefined : entries.length + 1}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: <thead> is only valid inside a <table>, and this grid is deliberately not one */}
      <div role="rowgroup" className="ds data-table-row-group header">
        {/* biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells */}
        <div
          role="row"
          className="ds data-table-row"
          aria-rowindex={windowing === undefined ? undefined : 1}
        >
          {selectable ? (
            <SelectAllCell
              selection={provider.selection}
              ids={scopes.ids}
              reserve={geometry.reserve}
            />
          ) : null}
          {rendered.map((column, position) => (
            <HeaderCell
              key={column.id}
              column={column}
              field={readFieldName(column)}
              sortable={
                column.sortable === true && orderable.has(readFieldName(column))
              }
              sort={state.slice.sort.find(
                (term) => term.field === readFieldName(column),
              )}
              setSort={provider.setSort}
              interaction={interaction}
              resizable={
                column.resizable === true && position < rendered.length - 1
              }
              bounds={readBounds(activeLayout.readDeclared(column.id))}
              // Solved for every rendered column, in the same order.
              width={geometry.widths[position] as number}
              labelId={`${baseId}-${column.id}`}
            />
          ))}
        </div>
      </div>
      {windowing === undefined ? (
        <TableBody {...body} />
      ) : (
        windowedRows(windowing, body, geometry.template)
      )}
    </div>
  );
}
