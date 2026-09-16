import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../testing/machines.js";
import useSelectAllOnPage from "./useSelectAllOnPage.js";

/** The ids the collection's selection holds, sorted. */
const readSelected = (
  provider: ReturnType<typeof createMachineProvider>["provider"],
): readonly string[] => [...provider.selection.state.get().ids].sort();

describe("useSelectAllOnPage", () => {
  it("is neither checked nor mixed over an empty page, and selects nothing", () => {
    const { provider } = createMachineProvider();
    const { result } = renderHook(() =>
      useSelectAllOnPage({ selection: provider.selection, ids: [] }),
    );
    expect(result.current.checked).toBe(false);
    expect(result.current.mixed).toBe(false);
    act(() => {
      result.current.toggle();
    });
    expect(readSelected(provider)).toEqual([]);
  });

  it("adds the page's identities, keeping a selection made elsewhere", () => {
    const { provider } = createMachineProvider();
    provider.selection.add(["elsewhere"]);
    const page = ["m-1", "m-2"];
    const { result } = renderHook(() =>
      useSelectAllOnPage({ selection: provider.selection, ids: page }),
    );
    act(() => {
      result.current.toggle();
    });
    expect(readSelected(provider)).toEqual(["elsewhere", "m-1", "m-2"]);
    expect(result.current.checked).toBe(true);
    expect(result.current.mixed).toBe(false);
  });

  it("removes only the page's identities once every one is selected", () => {
    const { provider } = createMachineProvider();
    provider.selection.add(["elsewhere", "m-1", "m-2"]);
    const page = ["m-1", "m-2"];
    const { result } = renderHook(() =>
      useSelectAllOnPage({ selection: provider.selection, ids: page }),
    );
    expect(result.current.checked).toBe(true);
    act(() => {
      result.current.toggle();
    });
    expect(readSelected(provider)).toEqual(["elsewhere"]);
  });

  it("is mixed while some of the page is selected, and selects the rest", () => {
    const { provider } = createMachineProvider();
    provider.selection.add(["m-1"]);
    const page = ["m-1", "m-2"];
    const { result } = renderHook(() =>
      useSelectAllOnPage({ selection: provider.selection, ids: page }),
    );
    expect(result.current.checked).toBe(false);
    expect(result.current.mixed).toBe(true);
    act(() => {
      result.current.toggle();
    });
    expect(readSelected(provider)).toEqual(["m-1", "m-2"]);
  });

  it("keeps one result while neither the page nor its selection moves", () => {
    const { provider } = createMachineProvider();
    const page = ["m-1"];
    const { result, rerender } = renderHook(() =>
      useSelectAllOnPage({ selection: provider.selection, ids: page }),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
