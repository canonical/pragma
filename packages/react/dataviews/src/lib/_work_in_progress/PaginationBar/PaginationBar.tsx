import type {
  ResultWindow,
  RowRecord,
  SchemaFieldDefinition,
  Slice,
} from "@canonical/dataviews-core";
import {
  areSlicesEqual,
  isDataViewsProvider,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { SelectInput } from "@canonical/react-ds-global-form";
import {
  type FocusEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  interceptSubmit,
  listHiddenFields,
  pluralizeNoun,
} from "../../utils/index.js";
import { useDataViewsValue } from "../DataViews/hooks/index.js";
import { PageControl } from "./common/index.js";
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
 * The hidden controls of one of the bar's GET forms. Rendered here rather
 * than through the composition's leaf: the bar's destinations differ per
 * render and it watches the state and the location already.
 */
const renderHiddenFields = (
  destination: URLSearchParams | null,
  omit: readonly string[],
): ReactElement[] =>
  listHiddenFields(destination, omit).map((field) => (
    <input
      key={field.key}
      type="hidden"
      name={field.name}
      value={field.value}
    />
  ));

/** What a bar without a location subscribes to: nothing moves its destinations. */
const subscribeToNothing = (): (() => void) => () => {};

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
 * every other page. It takes its provider explicitly, as DataTable does, so
 * a standalone table gets the same footer as a composed one. It offers only
 * pages the collection can reach, and a focused control that becomes
 * unavailable hands the focus to the page select.
 *
 * At baseline every destination is real: each page the collection can reach
 * is a link the provider's encoder spelled, and the page size and the page
 * select each sit in a GET form carrying the rest of the query, so the bar
 * pages before any script runs. The enhancement intercepts a plain click or
 * a submission and moves the window in place; controls only it can drive
 * are hidden until scripting is enabled.
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
  LinkComponent = "a",
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
  const { spellQuery, location } = readProviderHost(provider);
  // The destinations carry the location's other parameters too, which can
  // move without the query: the bar redraws when the location does.
  const readLocation = useCallback(
    () => location?.read().toString() ?? null,
    [location],
  );
  useSyncExternalStore(
    location?.subscribe ?? subscribeToNothing,
    readLocation,
    readLocation,
  );
  /** A window of the current query, spelled as the location carries it. */
  const spell = (moved: Partial<ResultWindow>): URLSearchParams | null =>
    spellQuery({
      slice: snapshot.slice,
      window: { ...snapshot.window, ...moved },
    });
  /** Every destination the bar offers; the location's text is read by the spelling. */
  const destinations = {
    query: spell({}),
    current: spell({ cursor: null }),
    first: spell({ page: 1, cursor: null }),
    previous: spell({ page: view.back, cursor: view.backCursor }),
    next: spell({ page: page + 1, cursor: view.nextCursor }),
    last: spell({ page: pages ?? page, cursor: null }),
  };

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

  // The navigation control last focused, until focus leaves it. A button
  // disabled while focused reports no blur, and a link replaced by one
  // leaves the document without a word, so this finds focus stranded.
  // Tracked on the navigation group, where focus events reach it from any
  // control — a router's own link included.
  const focused = useRef<HTMLElement | null>(null);
  const pageSelect = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    const control = focused.current;
    if (
      control !== null &&
      (!control.isConnected || control.matches(":disabled"))
    ) {
      focused.current = null;
      pageSelect.current?.focus();
    }
  });
  const trackFocus = {
    onFocus: (event: FocusEvent<HTMLElement>) => {
      focused.current = event.target;
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
        <form method="get" className="page-size" onSubmit={interceptSubmit}>
          <label htmlFor={sizeId}>Items per page:</label>
          <SelectInput
            id={sizeId}
            name="size"
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
          {/* The size is the select's, and the page is left to default: a
              new size is a new window, so the old page cannot survive it. */}
          {renderHiddenFields(destinations.query, ["page", "size", "cursor"])}
          <Button type="submit" importance="secondary" className="submit">
            Apply page size
          </Button>
        </form>
        <span className="divider" />
        <span role="status" className="summary">
          {describeSummary(view)}
        </span>
      </div>
      <div className="trailing">
        <form method="get" className="page" onSubmit={interceptSubmit}>
          <SelectInput
            ref={pageSelect}
            name="page"
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
          {renderHiddenFields(destinations.current, ["page"])}
          <Button type="submit" importance="secondary" className="submit">
            Go to page
          </Button>
        </form>
        <span className="divider" />
        <div className="navigation" {...trackFocus}>
          <PageControl
            LinkComponent={LinkComponent}
            icon="back-to-top"
            className="first"
            label="First page"
            destination={destinations.first}
            reachable={page > 1}
            onNavigate={go(1, null)}
          />
          <PageControl
            LinkComponent={LinkComponent}
            icon="chevron-left"
            className="previous"
            label="Previous page"
            destination={destinations.previous}
            reachable={page > 1}
            onNavigate={go(view.back, view.backCursor)}
          />
          <PageControl
            LinkComponent={LinkComponent}
            icon="chevron-right"
            className="next"
            label="Next page"
            destination={destinations.next}
            reachable={view.hasNext}
            onNavigate={go(page + 1, view.nextCursor)}
          />
          <PageControl
            LinkComponent={LinkComponent}
            icon="back-to-top"
            className="last"
            label="Last page"
            destination={destinations.last}
            reachable={pages !== null && page !== pages}
            onNavigate={go(pages ?? page, null)}
          />
        </div>
      </div>
    </nav>
  );
}
