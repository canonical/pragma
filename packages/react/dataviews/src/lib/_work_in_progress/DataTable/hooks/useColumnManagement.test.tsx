/**
 * The column management hook's edges, driven directly: changes that change
 * nothing, what each change says, focus a hidden column leaves behind, and
 * destinations without a location. What a reader sees of it is tested
 * through the settings part.
 */

import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { act, renderHook } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../testing/machines.js";
import type { DataTableColumn } from "../types.js";
import useColumnManagement from "./useColumnManagement.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status" },
];

/**
 * The hook over a provider, with a header row the test builds or none, and
 * an announcer that records what it is told.
 */
const mountHook = (
  row: HTMLDivElement | null = null,
  declared: readonly DataTableColumn[] = columns,
) => {
  const { provider } = createMachineProvider({ rows: [machine("m-1", "a")] });
  const headerRow = createRef<HTMLDivElement>();
  Object.assign(headerRow, { current: row });
  const announce = vi.fn<(message: ReactNode) => void>();
  const hook = renderHook(() =>
    useColumnManagement({
      provider,
      columns: declared,
      headerRow,
      messages: resolveMessages(),
      announce,
    }),
  );
  return { provider, hook, announce };
};

/** A header row of cells, each holding a button named for its column, or none. */
const buildHeaderRow = (cells: readonly (string | null)[]): HTMLDivElement => {
  const row = document.createElement("div");
  for (const name of cells) {
    const cell = document.createElement("div");
    cell.setAttribute("role", "columnheader");
    if (name !== null) {
      const button = document.createElement("button");
      button.textContent = name;
      cell.append(button);
    }
    row.append(cell);
  }
  document.body.append(row);
  onTestFinished(() => {
    row.remove();
  });
  return row;
};

describe("useColumnManagement", () => {
  it("changes nothing and announces nothing for a column it does not declare or a change that does nothing", () => {
    const { provider, hook, announce } = mountHook();
    act(() => {
      hook.result.current.changeColumn("region", "hide");
      hook.result.current.changeColumn("name", "move-left");
      hook.result.current.changeColumn("name", "show");
      hook.result.current.resetColumns();
    });
    expect(provider.presentation.state.get().presentation).toEqual({});
    expect(announce).not.toHaveBeenCalled();
    expect(hook.result.current.resettable).toBe(false);
  });

  it("reads each declared column's offers, and throws for a column it does not declare", () => {
    const { hook } = mountHook();
    expect(hook.result.current.readOffers("status")).toEqual({
      hide: true,
      show: false,
      "move-left": true,
      "move-right": false,
    });
    expect(() => hook.result.current.readOffers("region")).toThrow(
      'no column "region" is declared',
    );
  });

  it("spells no destination without a location", () => {
    const { hook } = mountHook();
    expect(hook.result.current.listDestinations()).toBeNull();
  });

  it("says where each change leaves the column, in the messages' words", () => {
    const { hook, announce } = mountHook();
    act(() => {
      hook.result.current.changeColumn("status", "move-left");
    });
    expect(announce).toHaveBeenLastCalledWith(
      "Status moved to position 1 of 2",
    );
    act(() => {
      hook.result.current.changeColumn("status", "hide");
    });
    expect(announce).toHaveBeenLastCalledWith("Status hidden");
    act(() => {
      hook.result.current.changeColumn("status", "show");
    });
    expect(announce).toHaveBeenLastCalledWith("Status shown, position 1 of 2");
    expect(hook.result.current.resettable).toBe(true);
    act(() => {
      hook.result.current.resetColumns();
    });
    expect(announce).toHaveBeenLastCalledWith("Table settings reset");
  });

  it("says a column that cannot be hidden is always shown, and changes nothing", () => {
    const { provider, hook, announce } = mountHook(null, [
      { id: "name", header: "Name", hideable: false },
      { id: "status", header: "Status" },
    ]);
    act(() => {
      hook.result.current.changeColumn("name", "hide");
    });
    expect(announce).toHaveBeenCalledExactlyOnceWith("Name is always shown");
    expect(provider.presentation.state.get().presentation).toEqual({});
  });

  it("says every column refused in one moment, not the last alone", () => {
    const { hook, announce } = mountHook(null, [
      { id: "name", header: "Name", hideable: false },
      { id: "status", header: "Status", hideable: false },
    ]);
    act(() => {
      hook.result.current.changeColumn("name", "hide");
      hook.result.current.changeColumn("status", "hide");
    });
    // Each column is its own subject: neither refusal stands for the other.
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenNthCalledWith(1, "Name is always shown");
    expect(announce).toHaveBeenNthCalledWith(2, "Status is always shown");
  });

  it("moves the focus a hidden column took with it to the header control standing where it stood", () => {
    const row = buildHeaderRow(["Name"]);
    const { hook } = mountHook(row);
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      hook.result.current.changeColumn("status", "hide");
    });
    // The column stood second; one control is left, so the last takes it.
    expect(row.querySelector("button")).toHaveFocus();
  });

  it("walks past headings holding no control, the nearest after then before, never to the settings first", () => {
    const row = buildHeaderRow([null, "Before", null, null]);
    const settings = document.createElement("div");
    settings.setAttribute("role", "columnheader");
    settings.className = "settings";
    settings.append(document.createElement("button"));
    row.append(settings);
    const { hook } = mountHook(row);
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      hook.result.current.changeColumn("name", "hide");
    });
    // The first heading, standing where the hidden column stood, holds no
    // control: the nearest after it holding one takes it, not the settings.
    expect(row.querySelector("button")).toHaveFocus();
    expect(row.querySelector("button")?.textContent).toBe("Before");
  });

  it("walks back to the nearest heading before where the hidden column stood, not the farthest", () => {
    const declared: readonly DataTableColumn[] = [
      { id: "far", header: "Far" },
      { id: "near", header: "Near" },
      { id: "gone", header: "Gone" },
      { id: "bare", header: "Bare" },
    ];
    const row = buildHeaderRow(["Far", "Near", null]);
    const { hook } = mountHook(row, declared);
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      hook.result.current.changeColumn("gone", "hide");
    });
    // Nothing from where it stood onward holds a control: the heading just
    // before it does, and takes the focus.
    expect(document.activeElement?.textContent).toBe("Near");
  });

  it("says nothing when the last shown column, hideable, is asked to hide", () => {
    const { hook, announce } = mountHook();
    act(() => {
      hook.result.current.changeColumn("name", "hide");
    });
    act(() => {
      hook.result.current.changeColumn("status", "hide");
    });
    // Only the first hide changed anything; a refused hide of a hideable
    // column is not "always shown".
    expect(announce).toHaveBeenCalledExactlyOnceWith("Name hidden");
  });

  it("leaves focus that is somewhere, and has nowhere to put focus that is not", () => {
    const row = buildHeaderRow(["Name"]);
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    onTestFinished(() => {
      elsewhere.remove();
    });
    const { hook } = mountHook(row);
    act(() => {
      elsewhere.focus();
      hook.result.current.changeColumn("status", "hide");
    });
    expect(elsewhere).toHaveFocus();
    act(() => {
      hook.result.current.changeColumn("status", "show");
    });
    // A header cell with no control, and a table with no header row.
    const bare = mountHook(buildHeaderRow([null]));
    act(() => {
      elsewhere.blur();
      bare.hook.result.current.changeColumn("status", "hide");
    });
    expect(document.body).toHaveFocus();
    const unmounted = mountHook(null);
    act(() => {
      unmounted.hook.result.current.changeColumn("status", "hide");
    });
    expect(unmounted.provider.presentation.state.get().presentation).toEqual({
      "table.hidden": ["status"],
    });
  });
});
