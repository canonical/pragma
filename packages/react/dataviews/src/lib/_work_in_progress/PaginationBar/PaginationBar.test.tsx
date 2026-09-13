/**
 * The pagination bar: destinations the collection can actually reach, and
 * counts that describe the rows on screen. It takes its provider explicitly,
 * so every case here mounts it with no DataViews root at all, and observes
 * it itself: the source's first request exists once the bar has rendered,
 * and each case answers it by hand.
 */
import {
  type Count,
  type DataViewsProvider,
  DEFAULT_WINDOW,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import {
  machines as collection,
  createMachineProvider,
  type Machine,
  type MachineFields,
  type MachineFixture,
  machine,
} from "../../../../testing/machines.js";
import type { ManualSource } from "../../../../testing/types.js";
import { DataViews } from "../DataViews/index.js";
import PaginationBar from "./PaginationBar.js";
import type { PaginationBarProps } from "./types.js";

type Provider = DataViewsProvider<MachineFields, Machine>;

/** The default window on one page of one size, as every case reads it. */
const at = (page: number, size: number) => ({
  ...DEFAULT_WINDOW,
  page,
  size,
});

/** A provider seeded on `window`, over a source each case answers by hand. */
const makeProvider = (window = at(1, 2)): MachineFixture =>
  createMachineProvider({ seed: { window } });

const machines = (count: number): readonly Machine[] =>
  Array.from({ length: count }, (_unused, index) =>
    machine(`m${index}`, `m${index}`),
  );

/**
 * Answer the request the provider currently wants: `count` rows the window
 * pages over, counted exactly, or null for a source that counts nothing.
 * `more` is the source's own word on a further page.
 */
const load = (
  source: ManualSource<Machine>,
  rows: readonly Machine[],
  count: number | null,
  more: boolean | null = null,
): void => {
  const counted: Count =
    count === null ? { kind: "unknown" } : { kind: "exact", value: count };
  act(() => {
    source.latest().deliver({
      status: "succeeded",
      page: {
        rows,
        groups: null,
        counts: { pageable: counted, matched: counted, total: counted },
        more,
        cursors: null,
      },
    });
  });
};

const mount = (
  provider: Provider,
  props: Omit<PaginationBarProps<MachineFields, Machine>, "provider"> = {},
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
const windowOf = (provider: Provider) => provider.state.get().window;

describe("PaginationBar", () => {
  it("refuses anything but a provider", () => {
    // A structural copy of a provider is not one: the check is by identity.
    const counterfeit = { ...createMachineProvider().provider };
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

  it("observes its provider for as long as it is mounted", () => {
    const { provider, source } = makeProvider();
    // Construction starts nothing: the first request is the bar's.
    expect(source.calls).toHaveLength(0);
    const { unmount } = mount(provider);
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).releases).toBe(0);
    unmount();
    // The last observer gone, the live execution is released.
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).releases).toBe(1);
  });

  it("pages its own provider, whatever root it sits in", () => {
    const outer = makeProvider();
    const own = makeProvider();
    render(
      <DataViews provider={outer.provider}>
        <PaginationBar provider={own.provider} />
      </DataViews>,
    );
    load(own.source, machines(2), 6);
    fireEvent.click(next());
    expect(windowOf(own.provider)).toEqual(at(2, 2));
    expect(windowOf(outer.provider)).toEqual(at(1, 2));
  });

  it("is a navigation named by its label, in the drawn order", () => {
    mount(makeProvider().provider, { label: "Machines pagination" });
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
    mount(makeProvider().provider);
    expect(
      screen.getByRole("navigation", { name: "Pagination" }),
    ).toBeInTheDocument();
  });

  it("claims nothing before the first results arrive", () => {
    mount(makeProvider().provider);
    expect(summary()).toBeEmptyDOMElement();
    expect(values(pageSelect())).toEqual(["1"]);
    expect(pageSelect()).not.toHaveAttribute("aria-describedby");
    for (const control of [first(), previous(), next(), last()]) {
      expect(control).toBeDisabled();
    }
  });

  it("summarises the rows on screen out of the filtered total", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 5);
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
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(1), 1);
    expect(summary()).toHaveTextContent(/^Showing item 1 out of 1$/);
    expect(screen.getByText("of 1 page")).toBeInTheDocument();
  });

  it("offers no last page when the source publishes no count", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), null);
    expect(summary()).toHaveTextContent(/^Showing 1–2 items$/);
    expect(screen.queryByText(/^of /)).toBeNull();
    expect(last()).toBeDisabled();
    // A full page is evidence there may be another; a short one is not.
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    load(source, machines(1), null);
    expect(next()).toBeDisabled();
    expect(summary()).toHaveTextContent(/^Showing item 3$/);
    // Every page before this one is reachable from the select.
    expect(values(pageSelect())).toEqual(["1", "2"]);
    expect(pageSelect()).toHaveValue("2");
  });

  it("takes the page's own word on a further page over its own guess", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    // A full page the source says is the last one.
    load(source, machines(2), null, false);
    expect(next()).toBeDisabled();
    act(() => {
      provider.refresh();
    });
    // A short page the source says has another behind it.
    load(source, machines(1), null, true);
    expect(next()).toBeEnabled();
  });

  it("goes to the first and last pages a count declares", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 6);
    fireEvent.click(last());
    expect(windowOf(provider)).toEqual(at(3, 2));
    load(source, machines(2), 6);
    expect(next()).toBeDisabled();
    expect(last()).toBeDisabled();
    fireEvent.click(first());
    expect(windowOf(provider)).toEqual(at(1, 2));
  });

  it("steps one page from wherever it is", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 6);
    fireEvent.click(next());
    load(source, machines(2), 6);
    expect(pageSelect()).toHaveValue("2");
    fireEvent.click(previous());
    expect(windowOf(provider)).toEqual(at(1, 2));
    load(source, machines(2), 6);
    fireEvent.click(next());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("jumps to the page the select names", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 6);
    fireEvent.change(pageSelect(), { target: { value: "3" } });
    expect(windowOf(provider)).toEqual(at(3, 2));
  });

  it("steps back from past the last page to the last one there is", () => {
    const { provider, source } = makeProvider(at(9, 2));
    mount(provider);
    load(source, [], 4);
    // The select still says where the window is, after the pages there are.
    expect(pageSelect()).toHaveValue("9");
    expect(values(pageSelect())).toEqual(["1", "2", "9"]);
    fireEvent.click(previous());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("steps back one page from the last", () => {
    const { provider, source } = makeProvider(at(3, 2));
    mount(provider);
    load(source, machines(2), 6);
    fireEvent.click(previous());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("goes to the last page from past it", () => {
    const { provider, source } = makeProvider(at(9, 2));
    mount(provider);
    load(source, [], 4);
    expect(last()).toBeEnabled();
    fireEvent.click(last());
    expect(windowOf(provider)).toEqual(at(2, 2));
  });

  it("keeps one page when the collection is empty", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, [], 0);
    expect(summary()).toHaveTextContent(/^Showing 0 out of 0 items$/);
    expect(screen.getByText("of 1 page")).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it("claims no total while a replacement request is in flight", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 5);
    act(() => {
      provider.navigateWindow({ page: 2 });
    });
    // The previous query's total does not describe the pending one, and the
    // rows still on screen are not the ones Next would page past.
    expect(summary()).toBeEmptyDOMElement();
    expect(screen.queryByText(/^of /)).toBeNull();
    expect(next()).toBeDisabled();
    load(source, machines(2), 5);
    expect(summary()).toHaveTextContent(/^Showing 3–4 out of 5 items$/);
    expect(next()).toBeEnabled();
  });

  it("announces the rows a new page brings", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 5);
    fireEvent.click(next());
    load(source, machines(2), 5);
    // The same count on another page: the range is what changes.
    expect(summary()).toHaveTextContent(/^Showing 3–4 out of 5 items$/);
    fireEvent.click(last());
    load(source, machines(1), 5);
    expect(summary()).toHaveTextContent(/^Showing item 5 out of 5$/);
  });

  it("keeps listing the settled pages while the next count is on its way", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 6);
    fireEvent.change(pageSelect(), { target: { value: "2" } });
    // No total is claimed while it loads, but the list is not cut short.
    expect(screen.queryByText(/^of /)).toBeNull();
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
  });

  it("keeps the settled pages across a history step to another page", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 6);
    // Back or forward adopts the query under a new request identity.
    act(() => {
      readProviderHost(provider).adopt({
        slice: provider.state.get().slice,
        window: at(2, 2),
      });
    });
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
  });

  it("keeps the settled pages through a page move within one generation, and drops them on reset", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 6);
    const { generation } = provider.state.get();
    fireEvent.click(next());
    // The move issues a request, not a generation: the list stands.
    expect(provider.state.get().generation).toBe(generation);
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
    load(source, machines(2), 6);
    expect(values(pageSelect())).toEqual(["1", "2", "3"]);
    act(() => {
      provider.reset();
    });
    // The next generation returns to the seed and counts afresh: nothing
    // settled under the old one describes it.
    expect(provider.state.get().generation).not.toBe(generation);
    expect(pageSelect()).toHaveValue("1");
    expect(values(pageSelect())).toEqual(["1"]);
    expect(screen.queryByText(/^of /)).toBeNull();
  });

  it("drops the settled pages when the query or the page size changes", () => {
    const { provider, source } = makeProvider();
    mount(provider, { sizes: [2, 25] });
    load(source, machines(2), 6);
    act(() => {
      provider.setSearch("m1");
    });
    // A new query makes a new count: the old one's pages may not exist.
    expect(values(pageSelect())).toEqual(["1"]);
    load(source, machines(2), 6);
    act(() => {
      provider.setSort([{ field: "name", direction: "asc" }]);
    });
    expect(values(pageSelect())).toEqual(["1"]);
    load(source, machines(2), 6);
    fireEvent.change(sizeSelect(), { target: { value: "25" } });
    expect(values(pageSelect())).toEqual(["1"]);
  });

  it("claims no total beside an earlier query's rows after the current one failed", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 5);
    act(() => {
      provider.setSearch("m1");
    });
    act(() => {
      source.latest().deliver({
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
    const { provider, source } = makeProvider();
    mount(provider, { sizes: [2, 25] });
    load(source, machines(2), 40);
    fireEvent.click(next());
    load(source, machines(2), 40);
    fireEvent.change(sizeSelect(), { target: { value: "25" } });
    // The old page number counted rows of a different size.
    expect(windowOf(provider)).toEqual(at(1, 25));
  });

  it("always offers the applied size, in order", () => {
    mount(makeProvider().provider);
    expect(values(sizeSelect())).toEqual(["2", "50", "75", "100"]);
    expect(sizeSelect()).toHaveValue("2");
  });

  it("offers each size once, and exactly the sizes given when one is applied", () => {
    mount(makeProvider(at(1, 25)).provider, { sizes: [50, 25, 50] });
    expect(values(sizeSelect())).toEqual(["50", "25"]);
  });

  it("moves focus to the page select when the focused button becomes unavailable", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 4);
    next().focus();
    fireEvent.click(next());
    // Next waits for the page it asked for, so it cannot keep the focus.
    expect(next()).toBeDisabled();
    expect(pageSelect()).toHaveFocus();
  });

  it("keeps focus on a button that stays available", () => {
    const { provider, source } = makeProvider(at(3, 2));
    mount(provider);
    load(source, machines(2), 6);
    previous().focus();
    fireEvent.click(previous());
    load(source, machines(2), 6);
    expect(previous()).toBeEnabled();
    expect(previous()).toHaveFocus();
  });

  it("leaves focus alone once it has left the buttons", () => {
    const { provider, source } = makeProvider();
    mount(provider);
    load(source, machines(2), 4);
    next().focus();
    next().blur();
    act(() => {
      provider.navigateWindow({ page: 2 });
    });
    expect(next()).toBeDisabled();
    expect(pageSelect()).not.toHaveFocus();
  });

  it("follows the window and pages under StrictMode", () => {
    const { provider, source } = makeProvider();
    render(
      <StrictMode>
        <PaginationBar provider={provider} />
      </StrictMode>,
    );
    // The rehearsal mount released its hold; the live execution is the
    // one the real mount started, for the same request.
    expect(source.callAt(0).releases).toBe(1);
    expect(source.latest().releases).toBe(0);
    load(source, machines(2), 5);
    expect(summary()).toHaveTextContent(/^Showing 1–2 out of 5 items$/);
    fireEvent.click(next());
    expect(windowOf(provider)).toEqual(at(2, 2));
    load(source, machines(2), 5);
    expect(pageSelect()).toHaveValue("2");
  });

  it("pages a cursor source by its tokens, and offers no jump", () => {
    // A forward cursor source reaches its next page only through the token
    // the current one handed back. It may still count its rows exactly; a
    // page total would nevertheless name pages nothing can address. Only
    // the source knows which pages its tokens reach, so it has to answer
    // for refusals itself; this one refuses nothing.
    const { provider, source } = createMachineProvider({
      seed: { window: at(1, 2) },
      capabilities: declareCapabilities(collection, {
        counts: { pageable: "exact" },
        pagination: { kind: "cursor", backward: false, durable: false },
      }),
      refusals: () => [],
    });
    mount(provider);
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: {
          rows: machines(2),
          groups: null,
          counts: {
            pageable: { kind: "exact", value: 6 },
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
    // And the source is asked for the page the token names.
    expect(source.latest().request.window.cursor).toBe("c:m1");
  });

  it("passes native nav props through and merges the class name", () => {
    mount(makeProvider().provider, {
      className: "footer",
      id: "machines-pages",
    });
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("ds", "data-table-pagination-bar", "footer");
    expect(nav).toHaveAttribute("id", "machines-pages");
  });
});
