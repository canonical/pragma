import type {
  RowRecord,
  SchemaFieldDefinition,
  Slice,
} from "@canonical/dataviews-core";
import {
  areSlicesEqual,
  isDataViewsProvider,
} from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { SelectInput } from "@canonical/react-ds-global-form";
import {
  type FocusEvent,
  type ReactElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { pluralizeNoun } from "../../utils/index.js";
import { useDataViewsValue } from "../DataViews/hooks/index.js";
import derivePaginationState from "./derivePaginationState.js";
import type { PaginationBarProps, PaginationState } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-table-pagination-bar";

const DEFAULT_SIZES: readonly number[] = [50, 75, 100];

/**
 * What the result summary says. Empty while the rows on screen answer an
 * earlier query. It names the rows, not only their count, so a page change
 * is announced.
 */
const describeSummary = ({
  page,
  size,
  shown,
  total,
}: PaginationState): string => {
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
    : `Showing ${range} out of ${total} ${pluralizeNoun(total, "item")}`;
};

/** A settled page count, and the generation, query and page size that made it. */
type SettledPages = {
  readonly pages: number;
  readonly generation: number;
  readonly slice: Slice;
  readonly size: number;
};

const listSizeOptions = (values: readonly number[]) =>
  values.map((value) => ({ value: String(value), label: String(value) }));

/**
 * The pagination bar is the navigation bar anchored to the bottom of the
 * table that lets users move between pages of data. The data table
 * supports two pagination variants, offset and keyset, chosen based on the
 * backend's pagination model. Both variants share a common pagination bar
 * but differ in the controls and information they expose.
 *
 * That is the design system's description of the block; its keyset variant
 * is the core's `cursor` pagination kind. What this implementation covers:
 * the page size, which items are on screen out of how many, and the way to
 * every other page. It takes its provider explicitly, as DataTable does, so a standalone table
 * gets the same footer as a composed one. It offers only pages the
 * collection can reach, and a focused button that becomes unavailable hands
 * the focus to the page select.
 *
 * `import { PaginationBar } from "@canonical/dataviews-react";`
 *
 * @implements ds:apps.subcomponent.data_table-pagination_bar
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
  if (!isDataViewsProvider(provider)) {
    throw new Error(
      "PaginationBar requires a provider created by createDataViewsProvider",
    );
  }
  // Observed for as long as the bar is mounted: a standalone bar is a mount
  // that reads the provider, and the ref-count makes a bar inside a root
  // that already observes cost nothing.
  useEffect(() => provider.observe(), [provider]);
  const snapshot = useDataViewsValue(provider.state);
  const view = derivePaginationState(
    snapshot,
    sizes,
    provider.capabilities.pagination,
  );
  const { page, pages } = view;
  const baseId = useId();
  const sizeId = `${baseId}-size`;
  const totalId = `${baseId}-total`;

  // The page select keeps the last settled page count while a page move
  // loads, so stepping through it does not cut its own list short. A new
  // query, page size or generation makes a new count, so it drops the old one.
  const [settled, setSettled] = useState<SettledPages | null>(null);
  const { generation, slice } = snapshot;
  const matching =
    settled !== null &&
    settled.generation === generation &&
    settled.size === view.size &&
    // The coordinator keeps the slice's identity while it stands, so the
    // comparison is by reference until the query really moves.
    (settled.slice === slice || areSlicesEqual(settled.slice, slice))
      ? settled
      : null;
  if (pages !== null && matching?.pages !== pages) {
    setSettled({ pages, generation, slice, size: view.size });
  }
  const listed = pages ?? matching?.pages ?? page;
  // A page past the last is listed after the real pages, so the select can
  // show it. Built once per page count: the bar redraws on every one of the
  // collection's publications, and the list is as long as the collection.
  const pageOptions = useMemo(
    () =>
      listSizeOptions([
        ...Array.from({ length: listed }, (_unused, at) => at + 1),
        ...(page > listed ? [page] : []),
      ]),
    [listed, page],
  );

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

  // The token goes with the page it addresses: a cursor source reaches its
  // next page only through the one its current page handed back, and an
  // offset source hands none back, so it moves by number alone.
  const go = (destination: number, cursor: string | null) => () => {
    provider.navigateWindow({ page: destination, cursor });
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
            options={listSizeOptions(view.sizes)}
            onChange={(event) => {
              // A new page size is a new window: the old page number counted
              // rows of a different size, so it cannot survive the change.
              provider.navigateWindow({
                page: 1,
                size: Number(event.target.value),
                cursor: null,
              });
            }}
          />
        </div>
        <span className="divider" />
        <span role="status" className="summary">
          {describeSummary(view)}
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
              provider.navigateWindow({
                page: Number(event.target.value),
                cursor: null,
              });
            }}
          />
          {pages === null ? null : (
            <span id={totalId} className="total">
              {`of ${pages} ${pluralizeNoun(pages, "page")}`}
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
            onClick={go(1, null)}
          />
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="chevron-left"
            className="previous"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={go(view.back, view.backCursor)}
          />
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="chevron-right"
            className="next"
            aria-label="Next page"
            disabled={!view.hasNext}
            onClick={go(page + 1, view.nextCursor)}
          />
          <Button
            {...trackFocus}
            type="button"
            importance="tertiary"
            icon="back-to-top"
            className="last"
            aria-label="Last page"
            disabled={pages === null || page === pages}
            onClick={go(pages ?? page, null)}
          />
        </div>
      </div>
    </nav>
  );
}
