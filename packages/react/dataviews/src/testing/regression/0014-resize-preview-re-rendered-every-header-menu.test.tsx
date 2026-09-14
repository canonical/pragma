/**
 * Regression: a live resize renders no header menu again.
 *
 * Before the fix, every frame of a column resize re-rendered the table's
 * header row, and each sortable header's menu with it — the menu handed a
 * new callback on every render — so a wide table paid a whole menu's hooks
 * per column per frame of the drag.
 *
 * The design system's menu is wrapped, not replaced: every render still
 * runs the real menu, and the wrapper only counts. React offers no
 * per-component render count to read otherwise, so this is the one module
 * mock in the registry, at the package boundary.
 */

import type * as DsGlobal from "@canonical/react-ds-global";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

const renders = vi.hoisted(() => ({ count: 0 }));

// The design system's menu, counted: each render of this wrapper is a
// render of a column's menu.
vi.mock("@canonical/react-ds-global", async (importOriginal) => {
  const actual = await importOriginal<typeof DsGlobal>();
  const CountedContextualMenu = (
    props: Parameters<typeof actual.ContextualMenu>[0],
  ) => {
    renders.count += 1;
    return createElement(actual.ContextualMenu, props);
  };
  return { ...actual, ContextualMenu: CountedContextualMenu };
});

describe("regression 0014 — a resize preview re-rendered every header menu", () => {
  it("renders no opened menu again for a resize step", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          {
            id: "name",
            header: "Name",
            sortable: true,
            resizable: true,
            sizing: { kind: "flex", weight: 1, minPx: 50 },
          },
          { id: "status", header: "Status", sortable: true },
        ]}
        label="Machines"
      />,
    );
    // Status's menu stays open through the resize: a closed menu is only its
    // button, so an open one is the menu a resize could render again.
    fireEvent.click(
      screen.getByRole("button", { name: "Sort options for Status" }),
    );
    expect(screen.getByRole("menu", { hidden: true })).toBeInTheDocument();
    expect(renders.count).toBeGreaterThan(0);
    const readTracks = () =>
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns");
    const before = readTracks();
    renders.count = 0;
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    // The geometry moved, and not one menu rendered for it.
    expect(readTracks()).not.toBe(before);
    expect(screen.getByRole("menu", { hidden: true })).toBeInTheDocument();
    expect(renders.count).toBe(0);
  });
});
