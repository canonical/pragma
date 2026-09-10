import type { ReactElement } from "react";
import { memo } from "react";
import useDataViewsValue from "../../../DataViews/hooks/useDataViewsValue.js";
import { rowStyle, statusCellStyle } from "../../tableStyles.js";
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
      {status === null ? (
        ids.map((id) => (
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
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one
        // biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells
        <div role="row" className="row status" style={rowStyle}>
          {/* biome-ignore lint/a11y/useSemanticElements: <td> is only valid inside a <table>, and this grid is deliberately not one */}
          <div
            role="cell"
            className={`cell status ${status.kind}`}
            style={statusCellStyle}
          >
            {renderStatus(status)}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The body observes the row identities itself, so a republication that
 * changes only the query, the ordering or the request status re-renders the
 * header and stops there — the rows go on watching their own channels. The
 * memo holds because the table hands it stable props: a caller's rebuilt
 * column array, `rowLabel` and `renderStatus` are all held at one identity.
 * A body with no rows re-renders with the table, which costs one status
 * row.
 */
export default memo(TableBody) as typeof TableBody;
