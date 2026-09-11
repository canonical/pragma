import type {
  Identity,
  RowRecord,
  SchemaFieldDefinition,
  Slice,
} from "@canonical/dataviews-core";
import { isIdentity, sliceEquals } from "@canonical/dataviews-core";
import { Button } from "@canonical/react-ds-global";
import { SelectInput } from "@canonical/react-ds-global-form";
import type { FocusEvent, ReactElement } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import useDataViewsValue from "../DataViews/hooks/useDataViewsValue.js";
import plural from "../DataViews/plural.js";
import type { PaginationState } from "./paginationState.js";
import paginationState from "./paginationState.js";
import type { PaginationBarProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-table-pagination-bar";

const DEFAULT_SIZES: readonly number[] = [50, 75, 100];

/**
 * What the result summary says. Empty while the rows on screen answer an
 * earlier query. It names the rows, not only their count, so a page change
 * is announced.
 */
const summaryOf = ({ page, size, shown, total }: PaginationState): string => {
  if (shown === null) {
    return "";
  }
  const first = (page - 1) * size + 1;
  if (shown === 1) {
    return total === null
      ? `Showing item ${first}`
      : `Showing item ${first} out of ${total}`;
  }
  const range = shown === 0 ? "0" : `${first}–${first + shown - 1}`;
  return total === null
    ? `Showing ${range} items`
    : `Showing ${range} out of ${total} ${plural(total, "item")}`;
};

/** A settled page count, and the scope, query and page size that made it. */
type SettledPages = {
  readonly pages: number;
  readonly scope: Identity;
  readonly slice: Slice;
  readonly size: number;
};

const optionsOf = (values: readonly number[]) =>
  values.map((value) => ({ value: String(value), label: String(value) }));

/**
 * The bar beneath a collection's rows: the page size, which items are on
 * screen out of how many, and the way to every other page.
 *
 * It takes its provider explicitly, as DataTable does, so a standalone table
 * gets the same footer as a composed one. It offers only pages the
 * collection can reach, and a focused button that becomes unavailable hands
 * the focus to the page select.
 *
 * @implements ds:apps.subcomponent.data_table-pagination_bar
 */
export default function PaginationBar<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
  label = "Pagination",
  sizes = DEFAULT_SIZES,
  className,
  ...rest
}: PaginationBarProps<TFields, TRow>): ReactElement {
  if (!isIdentity(provider?.identity)) {
    throw new Error(
      "PaginationBar requires a provider created by createDataViewsProvider",
    );
  }
  const snapshot = useDataViewsValue(provider.result);
  const view = paginationState(snapshot, sizes);
  const { page, pages } = view;
  const baseId = useId();
  const sizeId = `${baseId}-size`;
  const totalId = `${baseId}-total`;

  // The page select keeps the last settled page count while a page move
  // loads, so stepping through it does not cut its own list short. A new
  // query, page size or scope makes a new count, so it drops the old one.
  const [settled, setSettled] = useState<SettledPages | null>(null);
  const { scope, slice } = snapshot;
  const matching =
    settled !== null &&
    settled.scope === scope &&
    settled.size === view.size &&
    sliceEquals(settled.slice, slice)
      ? settled
      : null;
  if (pages !== null && matching?.pages !== pages) {
    setSettled({ pages, scope, slice, size: view.size });
  }
  const listed = pages ?? matching?.pages ?? page;
  // A page past the last is listed after the real pages, so the select can
  // show it.
  const pageOptions = optionsOf([
    ...Array.from({ length: listed }, (_, at) => at + 1),
    ...(page > listed ? [page] : []),
  ]);

  // The navigation button last focused, until focus leaves it. A button
  // disabled while focused reports no blur, so this finds focus stranded.
  const focused = useRef<HTMLButtonElement | null>(null);
  const pageSelect = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    if (focused.current?.disabled) {
      focused.current = null;
      pageSelect.current?.focus();
    }
  });
  const trackFocus = {
    onFocus: (event: FocusEvent<HTMLButtonElement>) => {
      focused.current = event.currentTarget;
    },
    onBlur: () => {
      focused.current = null;
    },
  };

  const go = (destination: number) => () => {
    provider.navigateWindow(destination);
  };

  return (
    <nav
      {...rest}
      aria-label={label}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="leading">
        <div className="page-size">
          <label htmlFor={sizeId}>Items per page:</label>
          <SelectInput
            id={sizeId}
            value={String(view.size)}
            options={optionsOf(view.sizes)}
            onChange={(event) => {
              // A new page size is a new window: the old page number counted
              // rows of a different size, so it cannot survive the change.
              provider.navigateWindow(1, Number(event.target.value));
            }}
          />
        </div>
        <span className="divider" />
        <span role="status" className="summary">
          {summaryOf(view)}
        </span>
      </div>
      <div className="trailing">
        <div className="page">
          <SelectInput
            ref={pageSelect}
            aria-label="Page"
            aria-describedby={pages === null ? undefined : totalId}
            value={String(page)}
            options={pageOptions}
            onChange={(event) => {
              provider.navigateWindow(Number(event.target.value));
            }}
          />
          {pages === null ? null : (
            <span id={totalId} className="total">
              {`of ${pages} ${plural(pages, "page")}`}
            </span>
          )}
        </div>
        <span className="divider" />
        <div className="navigation">
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="back-to-top"
            className="first"
            aria-label="First page"
            disabled={page <= 1}
            onClick={go(1)}
          />
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="chevron-left"
            className="previous"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={go(view.back)}
          />
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="chevron-right"
            className="next"
            aria-label="Next page"
            disabled={!view.hasNext}
            onClick={go(page + 1)}
          />
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="back-to-top"
            className="last"
            aria-label="Last page"
            disabled={pages === null || page === pages}
            onClick={go(pages ?? page)}
          />
        </div>
      </div>
    </nav>
  );
}
