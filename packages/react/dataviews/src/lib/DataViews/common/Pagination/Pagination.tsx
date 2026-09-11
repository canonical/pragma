import type { ReactElement } from "react";
import { useContext, useId } from "react";
import DataViewsContext from "../../Context.js";
import useDataViewsValue from "../../hooks/useDataViewsValue.js";
import type { PaginationProps } from "./types.js";

const componentCssClassName = "ds data-views-pagination";

const DEFAULT_SIZES: readonly number[] = [10, 25, 50, 100];

/**
 * Window navigation for the collection.
 *
 * The destinations are the ones the collection can actually reach. A source
 * that publishes a filtered total gets a last page and a "page n of m"; one
 * that publishes no count gets a Next offered only while the current page is
 * full, and no invented last page. While a replacement request is in flight,
 * or after it failed and left an earlier query's rows in view, that query's
 * total is not this one's, so no total is claimed and Next waits for results
 * that answer the current query.
 */
export default function Pagination({
  label = "Pagination",
  sizes = DEFAULT_SIZES,
  className,
  ...rest
}: PaginationProps): ReactElement {
  const provider = useContext(DataViewsContext);
  if (provider === null) {
    throw new Error(
      "DataViews.Pagination must be used inside a DataViews root",
    );
  }
  const state = useDataViewsValue(provider.result);
  const sizeId = useId();
  const { page, size } = state.window;
  const current = state.resultsMatchCurrentQuery;
  const total = current ? state.result.count : null;
  const pages = total === null ? null : Math.max(1, Math.ceil(total / size));
  // Without a total, a full page is the evidence there may be another one;
  // a short page is not, and rows a superseded query produced are evidence
  // of nothing at all.
  const rows = state.result.rows;
  const pageIsFull = rows !== null && rows.length === size;
  const hasNext = pages === null ? pageIsFull && current : page < pages;
  // A page past the last — an old link, a shrunken result — steps back to
  // the last page there is, not one page at a time.
  const back = pages !== null && page > pages ? pages : page - 1;
  const given = [...new Set(sizes)];
  const offered = given.includes(size)
    ? given
    : [...given, size].sort((a, b) => a - b);
  return (
    <nav
      {...rest}
      aria-label={label}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="previous"
        disabled={page <= 1}
        onClick={() => {
          provider.navigateWindow(back);
        }}
      >
        Previous
      </button>
      <p className="position">
        {/* Only the page the user moves to is announced; the total settles
            with the results and would otherwise announce twice. */}
        <span role="status">{`Page ${page}`}</span>
        {pages === null ? null : ` of ${pages}`}
      </p>
      <button
        type="button"
        className="next"
        disabled={!hasNext}
        onClick={() => {
          provider.navigateWindow(page + 1);
        }}
      >
        Next
      </button>
      <label htmlFor={sizeId} className="size-label">
        Rows per page
      </label>
      <select
        id={sizeId}
        className="size"
        value={size}
        onChange={(event) => {
          // A new page size is a new window: the old page number counted
          // rows of a different size, so it cannot survive the change.
          provider.navigateWindow(1, Number(event.target.value));
        }}
      >
        {offered.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </nav>
  );
}
