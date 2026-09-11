import type { ReactElement } from "react";
import { memo } from "react";
import useDataViewsValue from "../../../DataViews/hooks/useDataViewsValue.js";
import { Row } from "../Row/index.js";
import type { TableBodyProps } from "./types.js";

const componentCssClassName = "ds data-table-row-group body";

function TableBody<TRow extends object>({
  provider,
  scopes,
  columns,
  fields,
  selectable,
  rowLabel,
  status,
  renderStatus,
}: TableBodyProps<TRow>): ReactElement {
  const ids = useDataViewsValue(scopes.ids);
  return (
    // biome-ignore lint/a11y/useSemanticElements: <tbody> is only valid inside a <table>, and this grid is deliberately not one
    <div role="rowgroup" className={componentCssClassName}>
      {status !== null ? (
        // biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one
        // biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells
        <div role="row" className="ds data-table-row status">
          {/* biome-ignore lint/a11y/useSemanticElements: <td> is only valid inside a <table>, and this grid is deliberately not one */}
          <div
            role="cell"
            className={`ds data-table-body-cell status ${status.kind}`}
          >
            {status.kind === "stale" ? (
              // A polite status message: the rows did not move, so nothing
              // else says so.
              <span role="status">{renderStatus(status)}</span>
            ) : (
              renderStatus(status)
            )}
          </div>
        </div>
      ) : null}
      {status === null || status.kind === "stale"
        ? ids.map((id) => (
            <Row
              key={id}
              provider={provider}
              scope={scopes.scope(id)}
              columns={columns}
              fields={fields}
              selectable={selectable}
              rowLabel={rowLabel}
            />
          ))
        : null}
    </div>
  );
}

/**
 * The body observes the row identities itself, so a republication that
 * changes only the query, the ordering or the request status re-renders the
 * header and stops there — the rows go on watching their own channels. The
 * memo holds because the table hands it stable props: a caller's rebuilt
 * column array, `rowLabel` and `renderStatus` are all held at one identity.
 * A body showing a status re-renders with the table, which costs the status
 * row and, beside stale rows, one pass over memoised rows that bail out.
 */
export default memo(TableBody) as typeof TableBody;
