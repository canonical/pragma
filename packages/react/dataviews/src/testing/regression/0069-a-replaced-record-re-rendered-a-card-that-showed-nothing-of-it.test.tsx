/**
 * Every card subscribed to its whole record to name itself, though a card
 * names itself by its title field unless the caller names it. A page arriving
 * with the same values in fresh objects then re-rendered every card, for a
 * change no card showed. The record is read as the name itself, so a record
 * replaced without changing what it is called re-renders nothing.
 */

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { pageOf } from "../../../testing/fixtures.js";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { Cards } from "../../lib/_work_in_progress/Cards/index.js";
import type {
  DisplayField,
  DisplayFieldCellProps,
} from "../../lib/common/index.js";

describe("a page of records replaced by equal ones", () => {
  it("re-renders no card that shows nothing of what changed", () => {
    const renders: string[] = [];
    const Probe = ({ rowId }: DisplayFieldCellProps) => {
      renders.push(rowId);
      return null;
    };
    const fields: readonly DisplayField[] = [
      { id: "name", header: "Name" },
      { id: "probe", header: "Probe", field: "status", cell: Probe },
    ];
    const { provider, source } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m-1", "alpha")]),
      });
    });
    expect(renders).toEqual(["m-1"]);
    renders.length = 0;

    act(() => {
      provider.refresh();
    });
    act(() => {
      // The same machine, in a new object: nothing a card shows has moved.
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m-1", "alpha")]),
      });
    });
    expect(renders).toEqual([]);
    expect(screen.getByRole("listitem", { name: "alpha" })).toBeInTheDocument();
  });
});
