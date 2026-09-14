/**
 * The connected search part: a labelled native search input over the
 * applied search, edits that replace history rather than push it, the
 * applied value read without re-rendering on every result, and the GET
 * form the baseline submits. Each case is mutation-tested against that
 * contract.
 */
import {
  createMemoryLocation,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import createRecordingLocation from "../../../../../../testing/createRecordingLocation.js";
import { COUNTED_EXACTLY, pageOf } from "../../../../../../testing/fixtures.js";
import {
  createMachineProvider,
  type MachineProvider,
  machine,
  machines,
} from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import Search from "./Search.js";
import type { DataViewsSearchProps } from "./types.js";

const mount = (provider: MachineProvider, props: DataViewsSearchProps = {}) =>
  render(
    <DataViews provider={provider}>
      <Search {...props} />
    </DataViews>,
  );

const searchbox = (): HTMLInputElement =>
  screen.getByRole("searchbox", { name: "Search" });

describe("DataViews.Search", () => {
  it("is reachable as the composition's Search part", () => {
    expect(DataViews.Search).toBe(Search);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<Search />)).toThrow(
      "DataViews.Search must be used inside a DataViews root",
    );
  });

  it("throws where the source declares no search, as SavedViews does without a store", () => {
    const { provider } = createMachineProvider({
      capabilities: declareCapabilities(machines, { counts: COUNTED_EXACTLY }),
    });
    expect(() => mount(provider)).toThrow(
      "DataViews.Search requires a source that declares search",
    );
  });

  it("renders one labelled native search input, spelled as the wire spells search", () => {
    const { provider } = createMachineProvider({ rows: [] });
    mount(provider);
    const input = searchbox();
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveValue("");
    // The label is visible, not only an attribute.
    expect(screen.getByText("Search", { selector: "label" })).toHaveAttribute(
      "for",
      input.id,
    );
  });

  it("names the input from the label, inside an unnamed search landmark", () => {
    const { provider } = createMachineProvider({ rows: [] });
    const { container } = mount(provider, { label: "Find machines" });
    expect(
      screen.getByRole("searchbox", { name: "Find machines" }),
    ).toBeInTheDocument();
    // The root is the search landmark, which a screen reader announces by
    // its role; a name repeating the input's would be read twice.
    expect(screen.getByRole("search")).not.toHaveAttribute("aria-label");
    expect(container.querySelector("form")).toBe(screen.getByRole("search"));
  });

  it("applies every edit as it is typed, and each replaces the history entry", () => {
    const { location, writes } = createRecordingLocation({ href: "/machines" });
    const { provider } = createMachineProvider({ rows: [], location });
    mount(provider);
    writes.length = 0;
    for (const typed of ["y", "ya", "yak"]) {
      fireEvent.change(searchbox(), { target: { value: typed } });
      expect(provider.state.get().slice.search).toBe(typed);
    }
    expect(writes).toEqual([
      ["q=y&page=1&size=50", "replace"],
      ["q=ya&page=1&size=50", "replace"],
      ["q=yak&page=1&size=50", "replace"],
    ]);
    // Emptying the input clears the search rather than searching for nothing.
    fireEvent.change(searchbox(), { target: { value: "" } });
    expect(provider.state.get().slice.search).toBeNull();
    expect(writes.at(-1)).toEqual(["page=1&size=50", "replace"]);
  });

  it("shows the applied search, so Back restores it into the input", () => {
    const location = createMemoryLocation({ href: "/machines?q=alder" });
    const { provider } = createMachineProvider({ rows: [], location });
    mount(provider);
    expect(searchbox()).toHaveValue("alder");
    fireEvent.change(searchbox(), { target: { value: "birch" } });
    expect(searchbox()).toHaveValue("birch");
    // Back: the location moves, the provider adopts, the input follows.
    act(() => {
      location.write(new URLSearchParams("q=alder&page=1&size=50"));
    });
    expect(searchbox()).toHaveValue("alder");
    expect(provider.state.get().slice.search).toBe("alder");
  });

  it("reads the applied search without re-rendering on every result", () => {
    const { provider, source } = createMachineProvider();
    const rendered = vi.fn();
    render(
      <DataViews provider={provider}>
        <Profiler id="search" onRender={rendered}>
          <Search />
        </Profiler>
      </DataViews>,
    );
    const mounted = rendered.mock.calls.length;
    // Three publications that move no search: rows, a refresh, more rows.
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m1", "alder")]),
      });
    });
    act(() => {
      provider.refresh();
    });
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m2", "birch")]),
      });
    });
    expect(rendered).toHaveBeenCalledTimes(mounted);
    // A move of the search does re-render, with the new value.
    act(() => {
      readProviderHost(provider).adopt(
        {
          slice: { ...EMPTY_SLICE, search: "cedar" },
          window: DEFAULT_WINDOW,
        },
        "view",
        null,
      );
    });
    expect(rendered).toHaveBeenCalledTimes(mounted + 1);
    expect(searchbox()).toHaveValue("cedar");
  });

  it("is a GET form carrying the rest of the query hidden, from the first page", () => {
    const location = createMemoryLocation({
      href: "/machines?tab=overview&status=failed&q=old&sort=name__asc&page=3&size=10",
    });
    const { provider } = createMachineProvider({ rows: [], location });
    const { container } = mount(provider);
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("role", "search");
    // Every hidden control is a parameter the destination keeps: the host's
    // own, the filter, the ordering and the size — never the search, which
    // the input submits, nor the page, which a search resets.
    const hidden = [
      ...container.querySelectorAll<HTMLInputElement>("input[type=hidden]"),
    ].map((input) => [input.name, input.value]);
    expect(hidden).toEqual([
      ["tab", "overview"],
      ["status", "failed"],
      ["sort", "name__asc"],
      ["page", "1"],
      ["size", "10"],
    ]);
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("follows the location's other parameters into its hidden controls", () => {
    // A host parameter can move without the query moving — a tab switch,
    // say — and the destination a submission reaches must carry the new one.
    const location = createMemoryLocation({
      href: "/machines?tab=overview&status=failed",
    });
    const { provider } = createMachineProvider({ rows: [], location });
    const { container } = mount(provider);
    const hiddenTab = () =>
      container.querySelector<HTMLInputElement>('input[name="tab"]')?.value;
    expect(hiddenTab()).toBe("overview");
    act(() => {
      location.write(
        new URLSearchParams("tab=details&status=failed&page=1&size=50"),
      );
    });
    expect(provider.state.get().slice.filter).toHaveLength(1);
    expect(hiddenTab()).toBe("details");
  });

  it("intercepts a submission, which has nothing left to apply", () => {
    const { provider } = createMachineProvider({ rows: [] });
    const { container } = mount(provider);
    const form = container.querySelector("form");
    if (form === null) {
      throw new Error("expected the form");
    }
    expect(fireEvent.submit(form)).toBe(false);
  });

  it("carries no hidden control without a location, where no destination exists", () => {
    const { provider } = createMachineProvider({ rows: [] });
    const { container } = mount(provider);
    expect(container.querySelectorAll("input[type=hidden]")).toHaveLength(0);
  });

  it("passes native input props through, merges the class name and honours an id", () => {
    const { provider } = createMachineProvider({ rows: [] });
    const { container } = mount(provider, {
      className: "mine",
      id: "machine-search",
      placeholder: "host or owner",
      autoComplete: "off",
    });
    const input = searchbox();
    expect(input).toHaveAttribute("id", "machine-search");
    expect(input).toHaveAttribute("placeholder", "host or owner");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveClass("input", "mine");
    expect(container.querySelector("form")).toHaveClass(
      "ds",
      "data-views-search",
    );
    expect(container.querySelector("form")).not.toHaveClass("mine");
    // What the part sets, the caller cannot override through the spread.
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("name", "q");
  });

  it("edits and follows the provider under StrictMode", () => {
    const { location, writes, move } = createRecordingLocation({
      href: "/machines",
    });
    const { provider } = createMachineProvider({ rows: [], location });
    render(
      <StrictMode>
        <DataViews provider={provider}>
          <Search />
        </DataViews>
      </StrictMode>,
    );
    writes.length = 0;
    fireEvent.change(searchbox(), { target: { value: "yak" } });
    expect(searchbox()).toHaveValue("yak");
    expect(writes).toEqual([["q=yak&page=1&size=50", "replace"]]);
    act(() => {
      move("page=1&size=50");
    });
    expect(searchbox()).toHaveValue("");
  });
});
