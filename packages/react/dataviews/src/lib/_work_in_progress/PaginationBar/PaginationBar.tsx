import type {
  DataViewsMessages,
  ResultWindow,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  type DisplayPagination,
  isDataViewsProvider,
  readProviderHost,
  resolvePagination,
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
} from "react";
import { useDataViewsValue, useMessages } from "../../hooks/index.js";
import { interceptSubmit, listHiddenFields } from "../../utils/index.js";
import { PageControl } from "./common/index.js";
import { useRedrawOnDestinationInputs } from "./hooks/index.js";
import type { PaginationBarProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-table-pagination-bar";

const DEFAULT_SIZES: readonly number[] = [50, 75, 100];

/**
 * What the result summary says. Empty while the rows on screen answer an
 * earlier query. It names the rows, not only their count, so a page change
 * is announced; the count is said as the source claims it — exactly, as a
 * lower bound, or not at all.
 */
const describeSummary = (
  { page, size, shown, total }: DisplayPagination,
  messages: DataViewsMessages,
): string =>
  shown === null ? "" : messages.rowsShown((page - 1) * size + 1, shown, total);

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

/**
 * The pagination bar is the navigation bar anchored to the bottom of the
 * table that lets users move between pages of data. The data table
 * supports two pagination variants, offset and keyset, chosen based on the
 * backend's pagination model. Both variants share a common pagination bar
 * but differ in the controls and information they expose.
 *
 * That is the design system's description of the block; its keyset variant
 * is the core's `cursor` pagination kind. What this implementation covers:
 * the page size, which rows are on screen out of how many, and the way to
 * every other page. It takes its provider explicitly, as DataTable does, so
 * a standalone table gets the same footer as a composed one, and its words
 * from `messages`, over English. It offers only
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
  messages: given,
  label,
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
  const messages = useMessages(given);
  // Observed for as long as the bar is mounted: a standalone bar is a mount
  // that reads the provider, and the ref-count makes a bar inside a root
  // that already observes cost nothing.
  useEffect(() => provider.observe(), [provider]);
  const snapshot = useDataViewsValue(provider.state);
  // The core's facts: what is on screen, what is counted, what is reachable.
  const facts = resolvePagination(
    snapshot,
    provider.capabilities.pagination,
    sizes,
  );
  const { page, pages } = facts;
  const baseId = useId();
  const sizeId = `${baseId}-size`;
  const totalId = `${baseId}-total`;
  const { spellQuery } = readProviderHost(provider);
  // The destinations carry the saved view open beside the query and the
  // location's other parameters, either of which can move without the
  // query: the bar redraws when either does.
  useRedrawOnDestinationInputs({ provider });
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
    previous: spell({ page: facts.back, cursor: facts.backCursor }),
    next: spell({ page: page + 1, cursor: facts.nextCursor }),
    last: spell({ page: pages ?? page, cursor: null }),
  };

  // The page count holds while a page move loads, so stepping through the
  // select does not cut its own list short. Without one, the page itself.
  const listed = pages ?? page;
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
      aria-label={label ?? messages.pagination}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="leading">
        <form method="get" className="page-size" onSubmit={interceptSubmit}>
          <label htmlFor={sizeId}>{messages.rowsPerPage}</label>
          <SelectInput
            id={sizeId}
            name="size"
            value={String(facts.size)}
            options={listSizeOptions(facts.sizes)}
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
            {messages.submitPageSize}
          </Button>
        </form>
        <span className="divider" />
        <span role="status" className="summary">
          {describeSummary(facts, messages)}
        </span>
      </div>
      <div className="trailing">
        <form method="get" className="page" onSubmit={interceptSubmit}>
          <SelectInput
            ref={pageSelect}
            name="page"
            aria-label={messages.page}
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
              {messages.pageCount(pages)}
            </span>
          )}
          {renderHiddenFields(destinations.current, ["page"])}
          <Button type="submit" importance="secondary" className="submit">
            {messages.submitPage}
          </Button>
        </form>
        <span className="divider" />
        <div className="navigation" {...trackFocus}>
          <PageControl
            LinkComponent={LinkComponent}
            icon="back-to-top"
            className="first"
            label={messages.goToFirstPage}
            destination={destinations.first}
            reachable={page > 1}
            onNavigate={go(1, null)}
          />
          <PageControl
            LinkComponent={LinkComponent}
            icon="chevron-left"
            className="previous"
            label={messages.goToPreviousPage}
            destination={destinations.previous}
            reachable={page > 1}
            onNavigate={go(facts.back, facts.backCursor)}
          />
          <PageControl
            LinkComponent={LinkComponent}
            icon="chevron-right"
            className="next"
            label={messages.goToNextPage}
            destination={destinations.next}
            reachable={facts.hasNext}
            onNavigate={go(page + 1, facts.nextCursor)}
          />
          <PageControl
            LinkComponent={LinkComponent}
            icon="back-to-top"
            className="last"
            label={messages.goToLastPage}
            destination={destinations.last}
            reachable={pages !== null && page !== pages}
            onNavigate={go(pages ?? page, null)}
          />
        </div>
      </div>
    </nav>
  );
}
