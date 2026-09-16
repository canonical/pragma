/**
 * Regression: a change to one column handed every header's menu new offers.
 *
 * Before the fix, each column's offers were built afresh whenever the
 * arrangement changed — widths included — by running every column command
 * for every column, and a hide or a move gave every header a new offers
 * object, so every column's menu rendered again though its own changes had
 * not moved. Offers are now read from one resolution of the arrangement, and
 * a column keeps its offers object while its changes hold.
 */

import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { useColumnManagement } from "../../lib/_work_in_progress/DataTable/hooks/index.js";

describe("regression 0058 — a column change renewed every header's offers", () => {
  it("keeps the offers of every column whose changes hold, through a width and a hide elsewhere", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    const columns = [
      { id: "name", header: "Name" },
      { id: "status", header: "Status" },
      { id: "cores", header: "Cores" },
      { id: "owner", header: "Owner" },
    ];
    const hook = renderHook(() =>
      useColumnManagement({
        provider,
        columns,
        headerRow: createRef<HTMLDivElement>(),
        messages: resolveMessages(),
        announce: () => {},
      }),
    );
    const read = (id: string) => hook.result.current.readOffers(id);
    const before = columns.map(({ id }) => read(id));
    act(() => {
      provider.presentation.arrange({ "table.width.name": 240 });
    });
    columns.forEach(({ id }, at) => {
      expect(read(id)).toBe(before.at(at));
    });
    // Owner hidden: Cores is now last shown, Owner hidden; Name and Status
    // take the same changes as before.
    act(() => {
      hook.result.current.changeColumn("owner", "hide");
    });
    expect(read("name")).toBe(before.at(0));
    expect(read("status")).toBe(before.at(1));
    expect(read("cores")).not.toBe(before.at(2));
    expect(read("owner")).not.toBe(before.at(3));
  });
});
