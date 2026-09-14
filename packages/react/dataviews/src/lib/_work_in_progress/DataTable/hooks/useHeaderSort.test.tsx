import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../../../testing/machines.js";
import useHeaderSort from "./useHeaderSort.js";

describe("useHeaderSort", () => {
  it("changes nothing for an action on a column no longer shown", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(1),
    });
    const { slice, window } = provider.state.get();
    const before = slice.sort;
    const { result } = renderHook(() =>
      useHeaderSort({
        provider,
        columns: [{ id: "name", header: "Name", sortable: true }],
        slice,
        window,
      }),
    );
    result.current.sortColumn("gone", true);
    result.current.placeColumn("gone", "desc");
    result.current.removeFromSort("gone");
    expect(provider.state.get().slice.sort).toBe(before);
    expect(result.current.readReason("gone")).toBeNull();
    expect(result.current.spellDestination("gone")).toBeNull();
  });
});
