import { memo, type ReactElement } from "react";
import { Row } from "../Row/index.js";
import { StatusRow } from "../StatusRow/index.js";
import type { TableBodyProps } from "./types.js";

const componentCssClassName = "ds data-table-row-group body";

function TableBody<TRow extends object>({
  provider,
  scopes,
  entries,
  columns,
  selectable,
  rowLabel,
  renderStatus,
}: TableBodyProps<TRow>): ReactElement {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <tbody> is only valid inside a <table>, and this grid is deliberately not one
    <div role="rowgroup" className={componentCssClassName}>
      {entries.map((entry) =>
        entry.kind === "status" ? (
          <StatusRow
            key={entry.id}
            status={entry.status}
            renderStatus={renderStatus}
          />
        ) : (
          <Row
            key={entry.id}
            provider={provider}
            channels={scopes.readRow(entry.rowId)}
            columns={columns}
            selectable={selectable}
            rowLabel={rowLabel}
          />
        ),
      )}
    </div>
  );
}

/**
 * Every entry the table displays, in order. Memoised, and every prop is
 * held at one reference — the entries until a row identity or the status
 * changes, a caller's rebuilt column array and `rowLabel` always — so a
 * republication that changes only the query or the request status
 * re-renders the header and stops there. While a status shows, a new
 * `renderStatus` re-renders the body, which costs the status row and,
 * beside stale rows, one pass over memoised rows that bail out.
 */
export default memo(TableBody) as typeof TableBody;
