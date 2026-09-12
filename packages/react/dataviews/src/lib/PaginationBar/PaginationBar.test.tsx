/**
 * The pagination bar: destinations the collection can actually reach, and
 * counts that describe the rows on screen. It takes its provider explicitly,
 * so every case here mounts it with no DataViews root at all.
 */
import type { Count, DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
  DEFAULT_WINDOW,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { declaring } from "../capabilities.fixtures.js";
import DataViews from "../DataViews/Provider.js";
import PaginationBar from "./PaginationBar.js";
import type { PaginationBarProps } from "./types.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

type Fields = typeof schema.fields;
type Machine = { readonly id: string };

/** The default window on one page of one size, as every case reads it. */
const at = (page: number, size: number) => ({
  ...DEFAULT_WINDOW,
  page,
  size,
});

const makeProvider = (window = at(1, 2)): DataViewsProvider<Fields, Machine> =>
  createDataViewsProvider<Fields, Machine>({ schema, window });

const machines = (count: number): readonly Machine[] =>
  Array.from({ length: count }, (_unused, index) => ({ id: `m${index}` }));

/**
 * Deliver one page for the request the provider currently wants: `count`
 * rows the window pages over, counted exactly, or null for a source that
 * counts nothing. `more` is the source's own word on a further page.
 */
const load = (
  provider: DataViewsProvider<Fields, Machine>,
  rows: readonly Machine[],
  count: number | null,
  more: boolean | null = null,
): void => {
  const pending = provider.state.get().pendingRequestId ?? provider.refresh();
  if (pending === null) {
    throw new Error("expected a pending request");
  }
  const counted: Count =
    count === null ? { kind: "unknown" } : { kind: "exact", value: count };
  act(() => {
    provider.complete(pending, {
      status: "succeeded",
      page: {
        rows,
        groups: null,
        counts: { visible: counted, matched: counted, total: counted },
        more,
        cursors: null,
      },
    });
  });
};

const mount = (
  provider: DataViewsProvider<Fields, Machine>,
  props: Omit<PaginationBarProps<Fields, Machine>, "provider"> = {},
) => render(<PaginationBar {...props} provider={provider} />);

const summary = () => screen.getByRole("status");
const pageSelect = () => screen.getByRole("combobox", { name: "Page" });
const sizeSelect = () => screen.getByLabelText("Items per page:");
const button = (name: string) => screen.getByRole("button", { name });
const first = () => button("First page");
const previous = () => button("Previous page");
const next = () => button("Next page");
const last = () => button("Last page");
const values = (select: HTMLElement) =>
  [...select.querySelectorAll("option")].map((option) => option.value);
const windowOf = (provider: DataViewsProvider<Fields, Machine>) =>
  provider.state.get().window;

describe("PaginationBar", () => {
  it("refuses anything but a provider", () => {
    const counterfeit = { identity: {} } as unknown as DataViewsProvider<
      Fields,
      Machine
    >;
    expect(() => render(<PaginationBar provider={counterfeit} />)).toThrow(
      "PaginationBar requires a provider created by createDataViewsProvider",
    );
    expect(() =>
      // @ts-expect-error the provider is the one input the bar cannot derive
      render(<PaginationBar />),
    ).toThrow(
      "PaginationBar requires a provider created by createDataViewsProvider",
    );
  });

  it("pages its own provider, whatever root it sits in", () => {
    const outer = makeProvider();
    const own = makeProvider();
    render(
      <DataViews provider={outer}>
        <PaginationBar provider={own} />
      </DataViews>,
    );
    load(own, machines(2), 6);
    fireEvent.click(next());
    expect(windowOf(own)).toEqual(at(2, 2));
    expect(windowOf(outer)).toEqual(at(1, 2));
  });

  it("is a navigation named by its label, in the drawn order", () => {
    mount(makeProvider(), { label: "Machines pagination" });
    const nav = screen.getByRole("navigation", { name: "Machines pagination" });
    // Page size first, then the summary; the page select, then the buttons.
    expect([...nav.querySelectorAll("select, [role=status], button")]).toEqual([
      sizeSelect(),
      summary(),
      pageSelect(),
      first(),
      previous(),
      next(),
      last(),
    ]);
  });

  it("is named Pagination by default", () => {
    mount(makeProvider());
    expect(
      screen.getByRole("navigation", { name: "Pagination" }),
    ).toBeInTheDocument();
  });

  it("claims nothing before the first results arrive", () => {
    mount(makeProvider());
    expect(summary()).toBeEmptyDOMElement();
    expect(values(pageSelect())).toEqual(["1"]);
    expect(pageSelect()).not.toHaveAttribute("aria-describedby");
    for (const control of [first(), previous(), next(), last()]) {
      expect(control).toBeDisabled();
    }
  });

  it("summarises the rows on screen out of the filtered total", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    expect(summary()).toHaveTextContent(/^Showing 1–2 out of 5 items$/);
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
    // The total describes the select it sits beside.
    const total = screen.getByText("of 3 pages");
    expect(pageSelect()).toHaveAttribute("aria-describedby", total.id);
    expect(first()).toBeDisabled();
    expect(previous()).toBeDisabled();
    expect(next()).toBeEnabled();
    expect(last()).toBeEnabled();
  });

  it("counts one item and one page in the singular", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(1), 1);
    expect(summary()).toHaveTextContent(/^Showing item 1 out of 1$/);
    expect(screen.getByText("of 1 page")).toBeInTheDocument();
  });

  it("offers no last page when the source publishes no count", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), null);
    expect(summary()).toHaveTextContent(/^Showing 1–2 items$/);
    expect(screen.queryByText(/^of /)).toBeNull();
    expect(last()).toBeDisabled();
    // A full page is evidence there may be another; a short one is not.
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    load(provider, machines(1), null);
    expect(next()).toBeDisabled();
    expect(summary()).toHaveTextContent(/^Showing item 3$/);
    // Every page before this one is reachable from the select.
    expect(values(pageSelect())).toEqual(["1", "2"]);
    expect(pageSelect()).toHaveValue("2");
  });

  it("takes the page's own word on a further page over its own guess", () => {
    const provider = makeProvider();
    mount(provider);
    // A full page the source says is the last one.
    load(provider, machines(2), null, false);
    expect(next()).toBeDisabled();
    act(() => {
      provider.refresh();
    });
    // A short page the source says has another behind it.
    load(provider, machines(1), null, true);
    expect(next()).toBeEnabled();
  });

  it("goes to the first and last pages a count declares", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 6);
    fireEvent.click(last());
    expect(windowOf(provider)).toEqual(at(3, 2));
    load(provider, machines(2), 6);
    expect(next()).toBeDisabled();
    expect(last()).toBeDisabled();
    fireEvent.click(first());
    expect(windowOf(provider)).toEqual(at(1, 2));
  });

  it("steps one page from wherever it is", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 6);
    fireEvent.click(next());
    load(provider, machines(2), 6);
    expect(pageSelect()).toHaveValue("2");
    fireEvent.click(previous());
    expect(windowOf(provider)).toEqual(at(1, 2));
    load(provider, machines(2), 6);
    fireEvent.click(next());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("jumps to the page the select names", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 6);
    fireEvent.change(pageSelect(), { target: { value: "3" } });
    expect(windowOf(provider)).toEqual(at(3, 2));
  });

  it("steps back from past the last page to the last one there is", () => {
    const provider = makeProvider(at(9, 2));
    mount(provider);
    load(provider, [], 4);
    // The select still says where the window is, after the pages there are.
    expect(pageSelect()).toHaveValue("9");
    expect(values(pageSelect())).toEqual(["1", "2", "9"]);
    fireEvent.click(previous());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("steps back one page from the last", () => {
    const provider = makeProvider(at(3, 2));
    mount(provider);
    load(provider, machines(2), 6);
    fireEvent.click(previous());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("goes to the last page from past it", () => {
    const provider = makeProvider(at(9, 2));
    mount(provider);
    load(provider, [], 4);
    expect(last()).toBeEnabled();
    fireEvent.click(last());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("keeps one page when the collection is empty", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, [], 0);
    expect(summary()).toHaveTextContent(/^Showing 0 out of 0 items$/);
    expect(screen.getByText("of 1 page")).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it("claims no total while a replacement request is in flight", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    act(() => {
      provider.navigateWindow({ page: 2 });
    });
    // The previous query's total does not describe the pending one, and the
    // rows still on screen are not the ones Next would page past.
    expect(summary()).toBeEmptyDOMElement();
    expect(screen.queryByText(/^of /)).toBeNull();
    expect(next()).toBeDisabled();
    load(provider, machines(2), 5);
    expect(summary()).toHaveTextContent(/^Showing 3–4 out of 5 items$/);
    expect(next()).toBeEnabled();
  });

  it("announces the rows a new page brings", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    fireEvent.click(next());
    load(provider, machines(2), 5);
    // The same count on another page: the range is what changes.
    expect(summary()).toHaveTextContent(/^Showing 3–4 out of 5 items$/);
    fireEvent.click(last());
    load(provider, machines(1), 5);
    expect(summary()).toHaveTextContent(/^Showing item 5 out of 5$/);
  });

  it("keeps listing the settled pages while the next count is on its way", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 6);
    fireEvent.change(pageSelect(), { target: { value: "2" } });
    // No total is claimed while it loads, but the list is not cut short.
    expect(screen.queryByText(/^of /)).toBeNull();
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
  });

  it("keeps the settled pages across a history step to another page", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 6);
    // Back or forward adopts an equal query under a new identity.
    act(() => {
      provider.adopt({
        slice: provider.state.get().slice,
        window: at(2, 2),
      });
    });
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
  });

  it("drops the settled pages when the query, the page size or the scope changes", () => {
    const provider = makeProvider();
    mount(provider, { sizes: [2, 25] });
    load(provider, machines(2), 6);
    act(() => {
      provider.setSearch("m1");
    });
    // A new query makes a new count: the old one's pages may not exist.
    expect(values(pageSelect())).toEqual(["1"]);
    load(provider, machines(2), 6);
    act(() => {
      provider.setSort([{ field: "status", direction: "asc" }]);
    });
    expect(values(pageSelect())).toEqual(["1"]);
    load(provider, machines(2), 6);
    fireEvent.change(sizeSelect(), { target: { value: "25" } });
    expect(values(pageSelect())).toEqual(["1"]);
    load(provider, machines(2), 6);
    act(() => {
      provider.rotateScope();
    });
    expect(values(pageSelect())).toEqual(["1"]);
  });

  it("claims no total beside an earlier query's rows after the current one failed", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    act(() => {
      provider.setSearch("m1");
    });
    const failed = provider.state.get().pendingRequestId;
    if (failed === null) {
      throw new Error("expected a pending request");
    }
    act(() => {
      provider.complete(failed, {
        status: "failed",
        failure: { reason: "offline", cause: null, transient: null },
      });
    });
    expect(provider.state.get().result.status).toBe("stale");
    expect(summary()).toBeEmptyDOMElement();
    expect(next()).toBeDisabled();
    expect(last()).toBeDisabled();
  });

  it("resets to the first page when the page size changes", () => {
    const provider = makeProvider();
    mount(provider, { sizes: [2, 25] });
    load(provider, machines(2), 40);
    fireEvent.click(next());
    load(provider, machines(2), 40);
    fireEvent.change(sizeSelect(), { target: { value: "25" } });
    // The old page number counted rows of a different size.
    expect(windowOf(provider)).toEqual(at(1, 25));
  });

  it("always offers the applied size, in order", () => {
    mount(makeProvider());
    expect(values(sizeSelect())).toEqual(["2", "50", "75", "100"]);
    expect(sizeSelect()).toHaveValue("2");
  });

  it("offers each size once, and exactly the sizes given when one is applied", () => {
    mount(makeProvider(at(1, 25)), { sizes: [50, 25, 50] });
    expect(values(sizeSelect())).toEqual(["50", "25"]);
  });

  it("moves focus to the page select when the focused button becomes unavailable", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 4);
    next().focus();
    fireEvent.click(next());
    // Next waits for the page it asked for, so it cannot keep the focus.
    expect(next()).toBeDisabled();
    expect(pageSelect()).toHaveFocus();
  });

  it("keeps focus on a button that stays available", () => {
    const provider = makeProvider(at(3, 2));
    mount(provider);
    load(provider, machines(2), 6);
    previous().focus();
    fireEvent.click(previous());
    load(provider, machines(2), 6);
    expect(previous()).toBeEnabled();
    expect(previous()).toHaveFocus();
  });

  it("leaves focus alone once it has left the buttons", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 4);
    next().focus();
    next().blur();
    act(() => {
      provider.navigateWindow({ page: 2 });
    });
    expect(next()).toBeDisabled();
    expect(pageSelect()).not.toHaveFocus();
  });

  it("follows the window and pages under StrictMode", () => {
    const provider = makeProvider();
    render(
      <StrictMode>
        <PaginationBar provider={provider} />
      </StrictMode>,
    );
    load(provider, machines(2), 5);
    expect(summary()).toHaveTextContent(/^Showing 1–2 out of 5 items$/);
    fireEvent.click(next());
    expect(windowOf(provider)).toEqual(at(2, 2));
    load(provider, machines(2), 5);
    expect(pageSelect()).toHaveValue("2");
  });

  it("pages a cursor source by its tokens, and offers no jump", () => {
    // A forward cursor source reaches its next page only through the token
    // the current one handed back. It may still count its rows exactly; a
    // page total would nevertheless name pages nothing can address.
    const provider = createDataViewsProvider<Fields, Machine>({
      schema,
      window: at(1, 2),
      capabilities: declaring({
        counts: { visible: "exact", matched: "none", total: "none" },
        pagination: { mode: "cursor", backward: false, durable: false },
      }),
    });
    mount(provider);
    const pending = provider.state.get().pendingRequestId ?? provider.refresh();
    if (pending === null) {
      throw new Error("expected a pending request");
    }
    act(() => {
      provider.complete(pending, {
        status: "succeeded",
        page: {
          rows: machines(2),
          groups: null,
          counts: {
            visible: { kind: "exact", value: 6 },
            matched: { kind: "unknown" },
            total: { kind: "unknown" },
          },
          more: null,
          cursors: { next: "c:m1", previous: null },
        },
      });
    });
    expect(summary()).toHaveTextContent(/^Showing 1–2 out of 6 items$/);
    expect(screen.queryByText(/of \d+ pages?/)).toBe(null);
    expect(values(pageSelect())).toEqual(["1"]);
    expect(last()).toBeDisabled();
    fireEvent.click(next());
    expect(windowOf(provider)).toEqual({
      ...at(2, 2),
      cursor: "c:m1",
    });
  });

  it("passes native nav props through and merges the class name", () => {
    mount(makeProvider(), { className: "footer", id: "machines-pages" });
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("ds", "data-table-pagination-bar", "footer");
    expect(nav).toHaveAttribute("id", "machines-pages");
  });
});
