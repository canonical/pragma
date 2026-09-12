/**
 * The connected action bar: it reads the root's selection, shows only while
 * something is selected, and clears it.
 */
import type { DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import DataViews from "../../Provider.js";
import Actions from "./Actions.js";
import type { DataViewsActionsProps } from "./types.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

type Fields = typeof schema.fields;

const makeProvider = (): DataViewsProvider<Fields> =>
  createDataViewsProvider<Fields>({ schema });

const mount = (
  provider: DataViewsProvider<Fields>,
  props: DataViewsActionsProps = {},
) =>
  render(
    <DataViews provider={provider}>
      <Actions {...props} />
    </DataViews>,
  );

const select = (provider: DataViewsProvider<Fields>, ids: string[]): void => {
  act(() => {
    provider.selection.add(ids);
  });
};

const bar = () => screen.getByRole("group", { name: "Selection actions" });

describe("DataViews.Actions", () => {
  it("is reachable as the composition's Actions part", () => {
    expect(DataViews.Actions).toBe(Actions);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<Actions />)).toThrow(
      "DataViews.Actions must be used inside a DataViews root",
    );
  });

  it("is absent while nothing is selected", () => {
    const provider = makeProvider();
    const { container } = mount(provider);
    expect(container).toBeEmptyDOMElement();
    select(provider, ["m1"]);
    expect(bar()).toBeInTheDocument();
  });

  it("counts the whole selection and names the deselect by it", () => {
    const provider = makeProvider();
    mount(provider);
    // Selected rows need not be on screen: the count is the selection's.
    select(provider, ["m1", "m9"]);
    expect(bar()).toHaveTextContent("2 selected");
    expect(
      screen.getByRole("button", { name: "Deselect 2 items" }),
    ).toBeInTheDocument();
    act(() => {
      provider.selection.remove(["m9"]);
    });
    expect(bar()).toHaveTextContent("1 selected");
    expect(
      screen.getByRole("button", { name: "Deselect 1 item" }),
    ).toBeInTheDocument();
  });

  it("clears the selection, and leaves", () => {
    const provider = makeProvider();
    mount(provider);
    select(provider, ["m1", "m2"]);
    fireEvent.click(screen.getByRole("button", { name: "Deselect 2 items" }));
    expect(provider.selection.state.get().ids.size).toBe(0);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("places the caller's actions between the indicator and the deselect", () => {
    const provider = makeProvider();
    mount(provider, {
      children: (
        <button type="button" className="export">
          Export
        </button>
      ),
    });
    select(provider, ["m1"]);
    expect([...bar().children]).toEqual([
      within(bar()).getByRole("status"),
      screen.getByRole("button", { name: "Export" }),
      screen.getByRole("button", { name: "Deselect 1 item" }),
    ]);
  });

  it("takes a caller's indicator, or none", () => {
    const provider = makeProvider();
    const { rerender } = mount(provider, {
      indicator: <button type="button">Review selection</button>,
    });
    select(provider, ["m1"]);
    expect(
      screen.getByRole("button", { name: "Review selection" }),
    ).toBeInTheDocument();
    expect(bar()).not.toHaveTextContent("1 selected");
    rerender(
      <DataViews provider={provider}>
        <Actions indicator={null} />
      </DataViews>,
    );
    expect(within(bar()).queryByRole("status")).toBeNull();
  });

  it("sits on the contrasted surface, and passes native props through", () => {
    const provider = makeProvider();
    mount(provider, {
      label: "Machine actions",
      className: "footer",
      id: "machine-actions",
    });
    select(provider, ["m1"]);
    const group = screen.getByRole("group", { name: "Machine actions" });
    expect(group).toHaveClass(
      "ds",
      "data-table-action-bar",
      "contrasted",
      "footer",
    );
    expect(group).toHaveAttribute("id", "machine-actions");
  });

  it("announces the count as a status", () => {
    const provider = makeProvider();
    mount(provider);
    select(provider, ["m1", "m2"]);
    expect(within(bar()).getByRole("status")).toHaveTextContent("2 selected");
  });

  it("returns focus to where it entered the bar from when the bar leaves", () => {
    const provider = makeProvider();
    render(
      <DataViews provider={provider}>
        <button type="button">Before</button>
        <Actions>
          <button type="button">Archive</button>
        </Actions>
      </DataViews>,
    );
    select(provider, ["m1"]);
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();
    screen.getByRole("button", { name: "Archive" }).focus();
    // Moving within the bar keeps where the focus came from.
    const deselect = screen.getByRole("button", { name: "Deselect 1 item" });
    deselect.focus();
    fireEvent.click(deselect);
    expect(before).toHaveFocus();
  });

  it("has nowhere to return focus that entered from the document", () => {
    const provider = makeProvider();
    mount(provider);
    select(provider, ["m1"]);
    const deselect = screen.getByRole("button", { name: "Deselect 1 item" });
    deselect.focus();
    deselect.blur();
    deselect.focus();
    fireEvent.click(deselect);
    expect(document.body).toHaveFocus();
  });

  it("leaves focus alone once it has left the bar", () => {
    const provider = makeProvider();
    render(
      <DataViews provider={provider}>
        <button type="button">Before</button>
        <button type="button">Elsewhere</button>
        <Actions />
      </DataViews>,
    );
    select(provider, ["m1"]);
    screen.getByRole("button", { name: "Before" }).focus();
    screen.getByRole("button", { name: "Deselect 1 item" }).focus();
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    act(() => {
      provider.selection.clear();
    });
    expect(elsewhere).toHaveFocus();
  });

  it("calls the caller's focus handlers beside its own", () => {
    const provider = makeProvider();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(
      <DataViews provider={provider}>
        <button type="button">Before</button>
        <Actions onFocus={onFocus} onBlur={onBlur}>
          <button type="button">Export</button>
        </Actions>
      </DataViews>,
    );
    select(provider, ["m1"]);
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();
    screen.getByRole("button", { name: "Export" }).focus();
    const deselect = screen.getByRole("button", { name: "Deselect 1 item" });
    deselect.focus();
    expect(onFocus).toHaveBeenCalledWith(
      expect.objectContaining({ type: "focus" }),
    );
    expect(onBlur).toHaveBeenCalledTimes(1);
    // Its own handler still ran: the focus still goes back.
    fireEvent.click(deselect);
    expect(before).toHaveFocus();
  });

  it("returns no focus once it has left for the document", () => {
    const provider = makeProvider();
    render(
      <DataViews provider={provider}>
        <button type="button">Before</button>
        <Actions />
      </DataViews>,
    );
    select(provider, ["m1"]);
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();
    const deselect = screen.getByRole("button", { name: "Deselect 1 item" });
    deselect.focus();
    deselect.blur();
    act(() => {
      provider.selection.clear();
    });
    expect(before).not.toHaveFocus();
  });

  it("forgets where focus came from once it next enters from the document", () => {
    const provider = makeProvider();
    render(
      <DataViews provider={provider}>
        <button type="button">Before</button>
        <Actions />
      </DataViews>,
    );
    select(provider, ["m1"]);
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();
    screen.getByRole("button", { name: "Deselect 1 item" }).focus();
    fireEvent.click(screen.getByRole("button", { name: "Deselect 1 item" }));
    expect(before).toHaveFocus();
    select(provider, ["m2"]);
    // Focus enters again from the document: the earlier origin is not reused.
    before.blur();
    screen.getByRole("button", { name: "Deselect 1 item" }).focus();
    act(() => {
      provider.selection.clear();
    });
    expect(document.body).toHaveFocus();
  });

  it("merges the caller's ref with the one it holds, in both forms", () => {
    const provider = makeProvider();
    const held = createRef<HTMLDivElement>();
    const view = mount(provider, { ref: held });
    select(provider, ["m1"]);
    expect(held.current).toBe(bar());
    view.unmount();
    // A ref object is cleared on detach, and the bar still has its own root
    // to hand the focus back from.
    expect(held.current).toBe(null);

    const seen: (HTMLDivElement | null)[] = [];
    const second = makeProvider();
    const callback = mount(second, {
      ref: (node) => {
        seen.push(node);
      },
    });
    select(second, ["m1"]);
    expect(seen).toEqual([bar()]);
    callback.unmount();
    expect(seen[1]).toBe(null);

    // A callback returning its own cleanup gets that called instead.
    const cleanup = vi.fn();
    const third = makeProvider();
    const returning = mount(third, { ref: () => cleanup });
    select(third, ["m1"]);
    expect(cleanup).not.toHaveBeenCalled();
    returning.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("follows the selection under StrictMode", () => {
    const provider = makeProvider();
    render(
      <StrictMode>
        <DataViews provider={provider}>
          <Actions />
        </DataViews>
      </StrictMode>,
    );
    select(provider, ["m1", "m2", "m3"]);
    expect(bar()).toHaveTextContent("3 selected");
  });
});
