/**
 * The connected pagination part: destinations the collection can actually
 * reach, and counts that describe the rows on screen. Each case is
 * mutation-tested against that contract.
 */
import type { DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import DataViews from "../../Provider.js";
import Pagination from "./Pagination.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

type Fields = typeof schema.fields;
type Machine = { readonly id: string };

const makeProvider = (size = 2): DataViewsProvider<Fields, Machine> =>
  createDataViewsProvider<Fields, Machine>({
    schema,
    window: { page: 1, size },
  });

const machines = (count: number): readonly Machine[] =>
  Array.from({ length: count }, (_unused, index) => ({ id: `m${index}` }));

/** Deliver one page for the request the provider currently wants. */
const load = (
  provider: DataViewsProvider<Fields, Machine>,
  rows: readonly Machine[],
  count: number | null,
): void => {
  const pending = provider.result.get().pendingRequestId ?? provider.refresh();
  if (pending === null) {
    throw new Error("expected a pending request");
  }
  act(() => {
    provider.complete(pending, { status: "success", rows, count });
  });
};

const mount = (
  provider: DataViewsProvider<Fields, Machine>,
  props: Parameters<typeof Pagination>[0] = {},
) =>
  render(
    <DataViews provider={provider}>
      <Pagination {...props} />
    </DataViews>,
  );

/** The whole position readout: the announced page plus any total. */
const position = () => screen.getByRole("status").parentElement;
const previous = () => screen.getByRole("button", { name: "Previous" });
const next = () => screen.getByRole("button", { name: "Next" });

describe("DataViews.Pagination", () => {
  it("is reachable as the composition's Pagination part", () => {
    expect(DataViews.Pagination).toBe(Pagination);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<Pagination />)).toThrow(
      "DataViews.Pagination must be used inside a DataViews root",
    );
  });

  it("names the navigation and announces the position as a status", () => {
    mount(makeProvider());
    expect(
      screen.getByRole("navigation", { name: "Pagination" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Page 1$/);
  });

  it("announces the page, and leaves the total out of the announcement", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    expect(position()).toHaveTextContent(/^Page 1 of 3$/);
    expect(screen.getByRole("status")).toHaveTextContent(/^Page 1$/);
  });

  it("takes its accessible name from the label", () => {
    mount(makeProvider(), { label: "Machines pagination" });
    expect(
      screen.getByRole("navigation", { name: "Machines pagination" }),
    ).toBeInTheDocument();
  });

  it("counts the pages a filtered total makes reachable", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    expect(position()).toHaveTextContent(/^Page 1 of 3$/);
    expect(previous()).toBeDisabled();
    expect(next()).toBeEnabled();
  });

  it("offers no last page when the source publishes no count", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), null);
    expect(position()).toHaveTextContent(/^Page 1$/);
    // A full page is evidence there may be another; a short one is not.
    expect(next()).toBeEnabled();
    load(provider, machines(1), null);
    expect(next()).toBeDisabled();
  });

  it("stops at the last page a count declares", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 4);
    fireEvent.click(next());
    expect(provider.result.get().window).toEqual({ page: 2, size: 2 });
    load(provider, machines(2), 4);
    expect(position()).toHaveTextContent(/^Page 2 of 2$/);
    expect(next()).toBeDisabled();
    expect(previous()).toBeEnabled();
    fireEvent.click(previous());
    expect(provider.result.get().window).toEqual({ page: 1, size: 2 });
  });

  it("steps one page from wherever it is", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 6);
    fireEvent.click(next());
    load(provider, machines(2), 6);
    fireEvent.click(next());
    load(provider, machines(2), 6);
    expect(position()).toHaveTextContent(/^Page 3 of 3$/);
    fireEvent.click(previous());
    expect(provider.result.get().window).toEqual({ page: 2, size: 2 });
    load(provider, machines(2), 6);
    fireEvent.click(next());
    expect(provider.result.get().window).toEqual({ page: 3, size: 2 });
  });

  it("steps back from past the last page to the last one there is", () => {
    const provider = createDataViewsProvider<Fields, Machine>({
      schema,
      window: { page: 9, size: 2 },
    });
    mount(provider);
    load(provider, [], 4);
    expect(position()).toHaveTextContent(/^Page 9 of 2$/);
    fireEvent.click(previous());
    expect(provider.result.get().window).toEqual({ page: 2, size: 2 });
  });

  it("keeps one page when the collection is empty", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, [], 0);
    expect(position()).toHaveTextContent(/^Page 1 of 1$/);
    expect(next()).toBeDisabled();
  });

  it("claims no total while a replacement request is in flight", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    act(() => {
      provider.navigateWindow(2);
    });
    // The previous query's total does not describe the pending one, and the
    // rows still on screen are not the ones Next would page past.
    expect(position()).toHaveTextContent(/^Page 2$/);
    expect(next()).toBeDisabled();
    load(provider, machines(2), 5);
    expect(position()).toHaveTextContent(/^Page 2 of 3$/);
    expect(next()).toBeEnabled();
  });

  it("resets to the first page when the page size changes", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 40);
    fireEvent.click(next());
    load(provider, machines(2), 40);
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "25" },
    });
    // The old page number counted rows of a different size.
    expect(provider.result.get().window).toEqual({ page: 1, size: 25 });
  });

  it("always offers the applied size, in order", () => {
    mount(makeProvider(2));
    expect(
      screen
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["2", "10", "25", "50", "100"]);
    expect(screen.getByLabelText("Rows per page")).toHaveValue("2");
  });

  it("offers each size once", () => {
    mount(makeProvider(25), { sizes: [25, 50, 25] });
    expect(
      screen
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["25", "50"]);
  });

  it("follows the window and pages under StrictMode", () => {
    const provider = makeProvider();
    render(
      <StrictMode>
        <DataViews provider={provider}>
          <Pagination />
        </DataViews>
      </StrictMode>,
    );
    load(provider, machines(2), 5);
    expect(position()).toHaveTextContent(/^Page 1 of 3$/);
    fireEvent.click(next());
    expect(provider.result.get().window).toEqual({ page: 2, size: 2 });
    load(provider, machines(2), 5);
    expect(position()).toHaveTextContent(/^Page 2 of 3$/);
  });

  it("offers exactly the sizes it was given when one is applied", () => {
    mount(makeProvider(25), { sizes: [25, 50] });
    expect(
      screen
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["25", "50"]);
  });

  it("passes native nav props through and merges the class name", () => {
    mount(makeProvider(), { className: "footer", id: "machines-pages" });
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("ds", "data-views-pagination", "footer");
    expect(nav).toHaveAttribute("id", "machines-pages");
  });

  it("claims no total beside an earlier query's rows after the current one failed", () => {
    const provider = makeProvider();
    mount(provider);
    load(provider, machines(2), 5);
    act(() => {
      provider.setSearch("m1");
    });
    const failed = provider.result.get().pendingRequestId;
    if (failed === null) {
      throw new Error("expected a pending request");
    }
    act(() => {
      provider.complete(failed, { status: "failure", reason: "offline" });
    });
    expect(provider.result.get().result.status).toBe("stale");
    expect(position()).toHaveTextContent(/^Page 1$/);
    expect(next()).toBeDisabled();
  });
});
