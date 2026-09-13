import { Fragment, memo, type ReactElement } from "react";
import type { TableBodyProps } from "./types.js";

const componentCssClassName = "ds data-table-row-group body";

function TableBody({ entries, renderEntry }: TableBodyProps): ReactElement {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <tbody> is only valid inside a <table>, and this grid is deliberately not one
    <div role="rowgroup" className={componentCssClassName}>
      {entries.map((entry) => (
        <Fragment key={entry.id}>{renderEntry(entry)}</Fragment>
      ))}
    </div>
  );
}

/**
 * Every entry the table displays, in order. Memoised, and both props are
 * held at one reference — the entries until a row identity or the status
 * changes, the renderer until what it closes over does — so a republication
 * that changes only the query or the request status re-renders the header
 * and stops there. While a status shows, a new `renderStatus` re-renders
 * the body, which costs the status row and, beside kept rows, one pass over
 * memoised rows that bail out.
 */
export default memo(TableBody);
