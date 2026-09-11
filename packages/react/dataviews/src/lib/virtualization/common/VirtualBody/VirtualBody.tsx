import type { ReactElement } from "react";
import { memo } from "react";
import { Row, StatusRow } from "../../../DataTable/common/index.js";
import useDataViewsValue from "../../../DataViews/hooks/useDataViewsValue.js";
import { useVirtualRows } from "../../hooks/index.js";
import type { VirtualBodyProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-table-row-group body windowed";

/** The space of entries not mounted: hidden, since it holds no rows. */
const gap = (key: string, size: number): ReactElement => (
  <div
    key={key}
    className="ds data-table-gap"
    aria-hidden="true"
    style={{ blockSize: size }}
  />
);

function VirtualBody<TRow extends object>({
  provider,
  scopes,
  entries,
  columns,
  fields,
  selectable,
  rowLabel,
  renderStatus,
  estimatedRowHeight,
  tracks,
}: VirtualBodyProps<TRow>): ReactElement {
  const model = useDataViewsValue(provider.rows);
  const { mounted, body, refFor, onFocus, onBlur } = useVirtualRows({
    entries,
    estimatedRowHeight,
    model,
    tracks,
  });
  // One flat list, keyed by entry id, so a row keeps its element as it
  // moves between runs.
  const rows: ReactElement[] = [];
  for (const [position, run] of mounted.runs.entries()) {
    if (run.before > 0) {
      rows.push(gap(`gap-${position}`, run.before));
    }
    for (const entry of entries.slice(run.start, run.end)) {
      rows.push(
        entry.kind === "status" ? (
          <StatusRow
            key={entry.id}
            ref={refFor(entry.id)}
            position={entry.index}
            status={entry.status}
            renderStatus={renderStatus}
          />
        ) : (
          <Row
            key={entry.id}
            ref={refFor(entry.id)}
            position={entry.index}
            provider={provider}
            scope={scopes.scope(entry.rowId)}
            columns={columns}
            fields={fields}
            selectable={selectable}
            rowLabel={rowLabel}
          />
        ),
      );
    }
  }
  if (mounted.after > 0) {
    rows.push(gap("gap-after", mounted.after));
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: <tbody> is only valid inside a <table>, and this grid is deliberately not one
    <div
      ref={body}
      role="rowgroup"
      className={componentCssClassName}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {rows}
    </div>
  );
}

/**
 * The table's body, windowed: the entries near the viewport, each at its
 * logical row position, with a gap for the space of the rest. A scroll
 * that does not change the mounted entries renders nothing, and the rows
 * are memoised as they are in the table's own body, so one that stays
 * mounted is not rendered again. New tracks render the body once, to
 * forget the heights they outdate; its rows bail out.
 */
export default memo(VirtualBody) as typeof VirtualBody;
