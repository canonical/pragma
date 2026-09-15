/**
 * The column management hook's edges, driven directly: changes that change
 * nothing, what each change says, and destinations without a location. What a reader sees of it is tested
 * through the settings part.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../testing/machines.js";
import type { AnnouncementHandle } from "../common/index.js";
import type { DataTableColumn } from "../types.js";
import useColumnManagement from "./useColumnManagement.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status" },
];

/**
 * The hook over a provider, with an announcement that records what it is
 * told.
 */
const mountHook = () => {
  const { provider } = createMachineProvider({ rows: [machine("m-1", "a")] });
  const hook = renderHook(() => useColumnManagement({ provider, columns }));
  const announce = vi.fn<AnnouncementHandle["announce"]>();
  Object.assign(hook.result.current.announcer, { current: { announce } });
  return { provider, hook, announce };
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

  it("says nothing where the table renders no announcement", () => {
    const { provider } = createMachineProvider({ rows: [machine("m-1", "a")] });
    const hook = renderHook(() => useColumnManagement({ provider, columns }));
    act(() => {
      hook.result.current.changeColumn("status", "move-left");
    });
    expect(provider.presentation.state.get().presentation).toEqual({
      "table.order": ["status", "name"],
    });
  });

  it("spells no destination without a location", () => {
    const { hook } = mountHook();
    expect(hook.result.current.listDestinations()).toBeNull();
  });

  it("says where each change leaves the column", () => {
    const { hook, announce } = mountHook();
    act(() => {
      hook.result.current.changeColumn("status", "move-left");
    });
    expect(announce).toHaveBeenLastCalledWith({
      kind: "moved",
      column: columns.at(1),
      position: 1,
      count: 2,
    });
    act(() => {
      hook.result.current.changeColumn("status", "hide");
    });
    expect(announce).toHaveBeenLastCalledWith({
      kind: "hidden",
      column: columns.at(1),
    });
    act(() => {
      hook.result.current.changeColumn("status", "show");
    });
    expect(announce).toHaveBeenLastCalledWith({
      kind: "shown",
      column: columns.at(1),
      position: 1,
      count: 2,
    });
    expect(hook.result.current.resettable).toBe(true);
    act(() => {
      hook.result.current.resetColumns();
    });
    expect(announce).toHaveBeenLastCalledWith({ kind: "reset" });
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
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith({
      kind: "hidden",
      column: columns.at(0),
    });
  });
});
