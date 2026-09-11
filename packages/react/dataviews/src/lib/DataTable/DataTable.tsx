import type {
  ColumnSizing,
  ColumnToSize,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  createGridInteraction,
  createPresentation,
  isIdentity,
} from "@canonical/dataviews-core";
import type { CSSProperties, ReactElement, Ref } from "react";
import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import useDataViewsValue from "../DataViews/hooks/useDataViewsValue.js";
import {
  boundsOf,
  sameColumnModel,
  sameColumns,
  sizingOf,
} from "./columnKeys.js";
import { HeaderCell, SelectAllCell, TableBody } from "./common/index.js";
import defaultStatusText from "./defaultStatusText.js";
import {
  useRowScopes,
  useStableCallback,
  useStableValue,
  useTableGeometry,
} from "./hooks/index.js";
import tableStatus from "./tableStatus.js";
import type { DataTableProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-table";

/** The identity of the selection column, reserved from the caller's ids. */
const SELECTION_COLUMN_ID = "ds-selection";

/** A record answers to its own identity until the caller names it better. */
const defaultRowLabel = (_row: object, rowId: string): string => rowId;

/**
 * Hand the container to the caller's ref, in whichever form it arrives, and
 * report back the cleanup a callback ref returned. React 19 ref callbacks
 * may return one, and a caller that does gets it called on detach instead of
 * the `null` call React 19 no longer makes on its own.
 */
const applyRef = (
  ref: Ref<HTMLDivElement> | undefined,
  node: HTMLDivElement | null,
): (() => void) | undefined => {
  if (typeof ref === "function") {
    const cleanup = ref(node);
    return typeof cleanup === "function" ? cleanup : undefined;
  }
  if (ref) {
    ref.current = node;
  }
  return undefined;
};
const selectionSizing: ColumnSizing = { kind: "fixed", px: 40 };

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
 */
export default function DataTable<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
>({
  provider,
  columns,
  label,
  presentation,
  selectable = false,
  rowLabel = defaultRowLabel,
  renderStatus = defaultStatusText,
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
  const baseId = useId();

  // Both derivations are keyed on content, not on array identity: a caller
  // who rebuilds its column array on every render must not re-mint the
  // presentation, the interaction or one row scope, nor re-render one cell.
  // The two keys are separate because they answer different questions — a
  // caller's inline `header` node must not cost anyone a new presentation.
  const model = useStableValue(columns, sameColumnModel);
  const rendered = useStableValue(columns, sameColumns);

  const fields = useMemo<readonly string[]>(
    () => model.map((column) => column.field ?? column.id),
    [model],
  );
  const declaredTracks = useMemo<readonly ColumnToSize[]>(
    () => [
      ...(selectable
        ? [{ id: SELECTION_COLUMN_ID, sizing: selectionSizing }]
        : []),
      ...model.map((column) => ({ id: column.id, sizing: sizingOf(column) })),
    ],
    [model, selectable],
  );
  const columnIds = useMemo(
    () => declaredTracks.map((track) => track.id),
    [declaredTracks],
  );

  const ownPresentation = useMemo(
    () => createPresentation(declaredTracks),
    [declaredTracks],
  );
  const activePresentation = presentation ?? ownPresentation;
  const interaction = useMemo(
    () => createGridInteraction(activePresentation),
    [activePresentation],
  );
  // Subscribed from an effect, never from the render that built it: React
  // may discard a render — StrictMode double-invokes the body, and a
  // concurrent render can be thrown away — and a subscription taken at
  // construction would outlive the interaction nothing else holds.
  useEffect(() => interaction.observe(), [interaction]);

  const geometry = useTableGeometry(activePresentation, interaction, columnIds);
  const scopes = useRowScopes(provider, fields);
  const result = useDataViewsValue(provider.result);
  const status = tableStatus(result);
  const busy =
    result.result.status === "pending" || result.result.status === "refreshing";

  // The container ref is the table's own — the solver measures it — so a
  // caller's ref is merged onto it rather than dropped, as className and
  // style are. React sees one callback returning one cleanup, which detaches
  // the geometry and then releases the caller's ref: its own cleanup when it
  // returned one, the pre-19 `null` call when it did not. The caller's ref is
  // read through a latest-ref so an inline callback ref cannot change this
  // one's identity — a ref React re-ran per render would rebuild the resize
  // observer and re-measure the container on every frame of a drag.
  const callerRef = useRef(ref);
  callerRef.current = ref;
  const attachGeometry = geometry.attach;
  const attach = useCallback(
    (node: HTMLDivElement): (() => void) => {
      const detachGeometry = attachGeometry(node);
      const attached = callerRef.current;
      const releaseCaller = applyRef(attached, node);
      return () => {
        detachGeometry?.();
        if (releaseCaller === undefined) {
          applyRef(attached, null);
        } else {
          releaseCaller();
        }
      };
    },
    [attachGeometry],
  );

  // Held behind one identity apiece: the README's own examples pass these
  // as lambdas, and a new function per render would re-render every row
  // and every cell of the body for nothing.
  const nameRow = useStableCallback(rowLabel);
  const showStatus = useStableCallback(renderStatus);

  const selectionOffset = selectable ? 1 : 0;
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
    >
      {/* biome-ignore lint/a11y/useSemanticElements: <thead> is only valid inside a <table>, and this grid is deliberately not one */}
      <div role="rowgroup" className="ds data-table-row-group header">
        {/* biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells */}
        <div role="row" className="ds data-table-row">
          {selectable ? (
            <SelectAllCell selection={provider.selection} ids={scopes.ids} />
          ) : null}
          {rendered.map((column, position) => (
            <HeaderCell
              key={column.id}
              column={column}
              field={fields[position]}
              sort={result.slice.sort.find(
                (term) => term.field === fields[position],
              )}
              setSort={provider.setSort}
              interaction={interaction}
              resizable={
                column.resizable === true && position < rendered.length - 1
              }
              bounds={boundsOf(activePresentation.state.declared[column.id])}
              width={geometry.widths[position + selectionOffset]}
              labelId={`${baseId}-${column.id}`}
            />
          ))}
        </div>
      </div>
      <TableBody
        provider={provider}
        scopes={scopes}
        columns={rendered}
        fields={fields}
        selectable={selectable}
        rowLabel={nameRow}
        status={status}
        renderStatus={showStatus}
      />
    </div>
  );
}
