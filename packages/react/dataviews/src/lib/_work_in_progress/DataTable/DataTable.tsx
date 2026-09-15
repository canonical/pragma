import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  areDisplayStatusesEqual,
  type ColumnToSize,
  createColumnLayout,
  createGridInteraction,
  isDataViewsProvider,
  listDisplayEntries,
  readSizingBounds,
  resolveDisplayStatus,
} from "@canonical/dataviews-core/bindings";
import {
  type CSSProperties,
  isValidElement,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  type EntryRenderer,
  VIRTUALIZED,
  type VirtualizedBodyProps,
} from "../../common/index.js";
import {
  useDataViewsValue,
  useIsHydrated,
  useMergedRef,
} from "../../hooks/index.js";
import {
  Announcement,
  HeaderCell,
  Row,
  SelectAllCell,
  SettingsCell,
  type SettingsMenuProps,
  StatusRow,
  TableBody,
} from "./common/index.js";
import {
  areColumnModelsEqual,
  readFieldName,
  readSizing,
} from "./common/utils/index.js";
import describeStatus from "./describeStatus.js";
import {
  useColumnArrangement,
  useColumnManagement,
  useHeaderSort,
  useRowScopes,
  useStableCallback,
  useStableValue,
  useTableGeometry,
} from "./hooks/index.js";
import type { DataTableProps, DataTableVirtualization } from "./types.js";
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
 * The body a virtualization descriptor carries, given what a virtualized body
 * renders from: the entries and their renderer, the row model, and the
 * published tracks, which re-wrap cells when they change.
 */
const renderVirtualizedBody = (
  virtualization: DataTableVirtualization,
  props: Omit<VirtualizedBodyProps, "estimatedRowHeight">,
): ReactElement => {
  const { body: Body, estimatedRowHeight } = virtualization[VIRTUALIZED];
  return <Body {...props} estimatedRowHeight={estimatedRowHeight} />;
};

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
 * presentation, announced politely with where the column now stands, and
 * asks the source for nothing.
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
>({
  provider,
  columns,
  label,
  selectable = false,
  rowLabel = defaultRowLabel,
  renderStatus = describeStatus,
  virtualization,
  settings,
  className,
  style,
  ref,
  ...rest
}: DataTableProps<TFields, TRow>): ReactElement {
  if (!isDataViewsProvider(provider)) {
    throw new Error(
      "DataTable requires a provider created by createDataViewsProvider",
    );
  }
  // Observed for as long as the table is mounted: a standalone table is a
  // mount that reads the provider, and the ref-count makes a table inside
  // a root that already observes cost nothing.
  useEffect(() => provider.observe(), [provider]);
  // Sorting is offered from the same declaration Filters reads.
  const declared = provider.capabilities;
  const sortableFields =
    declared.sort.terms === 0 ? NO_SORTABLE_FIELDS : declared.sort.fields;
  // A set, because the header asks once per column and the table redraws on
  // every frame of a resize. One identity for "nothing is sortable", so the
  // memo holds there too.
  const orderable = useMemo(() => new Set(sortableFields), [sortableFields]);
  const baseId = useId();
  const hydrated = useIsHydrated();

  // The columns the presentation shows, in its order. Both derivations
  // below are keyed on content, not on array identity: a caller who
  // rebuilds its column array on every render must not re-mint the layout,
  // the interaction or one row scope, nor re-render one cell. The two keys
  // are separate because they answer different questions — a caller's
  // inline `header` node must not cost anyone a new layout.
  const rendered = useColumnArrangement({
    presentation: provider.presentation,
    columns,
  });
  const model = useStableValue(rendered, areColumnModelsEqual);

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

  // The layout is this table's view over the provider's presentation: its
  // widths are read from there and a resize is written there, so nothing
  // here holds a width of its own.
  const layout = useMemo(
    () =>
      createColumnLayout({
        columns: declaredTracks,
        presentation: provider.presentation,
      }),
    [declaredTracks, provider],
  );
  const interaction = useMemo(() => createGridInteraction(layout), [layout]);
  // Subscribed from an effect, never from the render that built it: React
  // may discard a render — StrictMode double-invokes the body, and a
  // concurrent render can be thrown away — and a subscription taken at
  // construction would outlive the interaction nothing else holds.
  useEffect(() => interaction.observe(), [interaction]);

  const geometry = useTableGeometry(layout, interaction, columnIds);
  const scopes = useRowScopes(provider, fields);
  const state = useDataViewsValue(provider.state);
  // The core's answer, held at one reference while it says the same thing,
  // so the entries are listed again only when a row identity or the status
  // changes.
  const status = useStableValue(
    resolveDisplayStatus(state),
    areDisplayStatusesEqual,
  );
  const ids = useDataViewsValue(scopes.ids);
  // The core decides what the body shows: the status row first, then the
  // rows where the status keeps them.
  const entries = useMemo(
    () => listDisplayEntries({ rowIds: ids, status }),
    [ids, status],
  );
  // Busy while a request is in flight, and only then: the root says so
  // over retained rows as over none.
  const busy = state.pendingRequestId !== null;

  // The header row's sort: the ordering in force and what each column shows
  // of it, the column that claims it, refusals, no-JS destinations, and the
  // actions every header shares.
  const headerSort = useHeaderSort({
    provider,
    columns: rendered,
    slice: state.slice,
    window: state.window,
  });

  // The columns' visibility and places, as the settings menu offers them
  // and every change to them is announced. The header row takes the focus a
  // hidden column's own controls leave.
  const headerRow = useRef<HTMLDivElement>(null);
  const {
    settings: columnSettings,
    readOffers,
    resettable,
    announcer,
    changeColumn,
    resetColumns,
    listDestinations,
  } = useColumnManagement({ provider, columns, headerRow });
  // One value while none of it changes, so a frame of a resize re-renders
  // no settings menu.
  const menu = useMemo<SettingsMenuProps>(
    () => ({
      settings: columnSettings,
      resettable,
      hydrated,
      onChange: changeColumn,
      onReset: resetColumns,
      listDestinations,
    }),
    [
      columnSettings,
      resettable,
      hydrated,
      changeColumn,
      resetColumns,
      listDestinations,
    ],
  );

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
  // While a status shows, the caller's own function, so a new one is
  // shown at once; otherwise the held one, which re-renders nothing.
  const renderer = status === null ? showStatus : renderStatus;

  // One renderer for either body, held while what it closes over holds:
  // the bodies key, place and measure rows without knowing them.
  const renderEntry = useCallback<EntryRenderer>(
    (entry, placement) =>
      entry.kind === "status" ? (
        <StatusRow
          ref={placement?.ref}
          position={placement?.position}
          status={entry.status}
          renderStatus={renderer}
        />
      ) : (
        <Row
          ref={placement?.ref}
          position={placement?.position}
          provider={provider}
          channels={scopes.readRow(entry.rowId)}
          columns={rendered}
          selectable={selectable}
          rowLabel={nameRow}
        />
      ),
    [renderer, provider, scopes, rendered, selectable, nameRow],
  );

  // A custom property, which `CSSProperties` does not spell.
  const geometryStyle = {
    ...style,
    "--data-table-columns": geometry.template,
  } as CSSProperties;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: a <table> resolves each row's widths from its own content, which is exactly what this grid replaces with one shared track list */}
      <div
        {...rest}
        ref={attach}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        style={geometryStyle}
        role="table"
        aria-label={label}
        aria-busy={busy}
        // Every logical row, the header's included, so a row a virtualized
        // table has not mounted is still counted.
        aria-rowcount={
          virtualization === undefined ? undefined : entries.length + 1
        }
      >
        {/* biome-ignore lint/a11y/useSemanticElements: <thead> is only valid inside a <table>, and this grid is deliberately not one */}
        <div role="rowgroup" className="ds data-table-row-group header">
          {/* biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one */}
          {/* biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells */}
          <div
            ref={headerRow}
            role="row"
            className="ds data-table-row"
            aria-rowindex={virtualization === undefined ? undefined : 1}
          >
            {selectable ? (
              <SelectAllCell
                selection={provider.selection}
                ids={scopes.ids}
                reserve={geometry.reserve}
              />
            ) : null}
            {rendered.map((column, position) => {
              const field = readFieldName(column);
              const sortable = column.sortable === true && orderable.has(field);
              return (
                <HeaderCell
                  key={column.id}
                  column={column}
                  sortable={sortable}
                  precedence={headerSort.precedences.get(field) ?? null}
                  primary={column.id === headerSort.primaryColumnId}
                  // Spelled only while it is rendered: once scripts take over
                  // the header is a button, and nothing reads a destination.
                  destination={
                    sortable && !hydrated
                      ? headerSort.spellDestination(column.id)
                      : null
                  }
                  hydrated={hydrated}
                  reason={headerSort.readReason(column.id)}
                  onClearRefusal={headerSort.clearRefusal}
                  onSort={headerSort.sortColumn}
                  removable={headerSort.stated.has(field)}
                  onPlace={headerSort.placeColumn}
                  onRemoveFromSort={headerSort.removeFromSort}
                  offers={readOffers(column.id)}
                  onChangeColumn={changeColumn}
                  interaction={interaction}
                  resizable={
                    column.resizable === true && position < rendered.length - 1
                  }
                  bounds={readSizingBounds(layout.readDeclared(column.id))}
                  // Solved for every rendered column, in the same order.
                  width={geometry.widths[position] as number}
                  labelId={`${baseId}-${column.id}`}
                />
              );
            })}
            {!isValidElement(settings) ? null : (
              <SettingsCell
                settings={settings}
                menu={menu}
                reserve={geometry.reserve}
              />
            )}
          </div>
        </div>
        {virtualization === undefined ? (
          <TableBody entries={entries} renderEntry={renderEntry} />
        ) : (
          renderVirtualizedBody(virtualization, {
            entries,
            renderEntry,
            rows: provider.rows,
            tracks: geometry.template,
          })
        )}
      </div>
      {/* Beside the table rather than in it: a table's children are its row
          groups. It holds what it last said itself, so saying something
          renders nothing but it. */}
      <Announcement ref={announcer} />
    </>
  );
}
