/**
 * Column widths kept in the collection's layout: applied as fixed
 * widths within their declared bounds, and a committed resize saved back.
 */

import {
  createDataViewsProvider,
  createSchema,
  type ProviderViews,
  type ViewPresentation,
  type ViewStore,
} from "@canonical/dataviews-core";
import { createColumnLayout } from "@canonical/dataviews-core/bindings";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { spellWidthKey } from "../common/utils/index.js";
import usePreferredWidths from "./usePreferredWidths.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed"] },
]);

const columns = () =>
  createColumnLayout([
    { id: "name", sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 400 } },
    { id: "status", sizing: { kind: "flex", weight: 1, minPx: 80 } },
    { id: "owner", sizing: { kind: "fixed", px: 120 } },
  ]);

/** A store call this test never makes. */
const unused = () => Promise.reject(new Error("not used in this test"));

/** A provider's views over a store holding these default preferences. */
const viewsWith = (
  preferences: ViewPresentation,
  patchPresentation: ViewStore["patchPresentation"] = async () => ({
    status: "saved",
  }),
): ProviderViews => {
  const store: ViewStore = {
    list: async () => ({ views: [], unreadable: [] }),
    get: unused,
    create: unused,
    update: unused,
    remove: unused,
    pin: unused,
    unpin: unused,
    readPresentation: async () => preferences,
    patchPresentation,
    subscribe: () => () => {},
    dispose: () => {},
  };
  const { views } = createDataViewsProvider({ schema, views: store });
  if (views === null) {
    throw new Error("expected views");
  }
  return views;
};

describe("usePreferredWidths", () => {
  it("does nothing without views", () => {
    const layout = columns();
    renderHook(() => usePreferredWidths(layout, null));
    layout.setOverride("name", { kind: "fixed", px: 150 });
    expect(layout.state.get().overrides).toEqual({
      name: { kind: "fixed", px: 150 },
    });
  });

  it("applies the widths the layout holds, held to their declared bounds", async () => {
    const layout = columns();
    const views = viewsWith({
      [spellWidthKey("name")]: 900,
      [spellWidthKey("status")]: 60,
    });
    renderHook(() => usePreferredWidths(layout, views));
    // The hook reads the preferences itself: no views control is needed.
    await waitFor(() => {
      expect(layout.state.get().overrides).toEqual({
        name: { kind: "fixed", px: 400 },
        status: { kind: "fixed", px: 80 },
      });
    });
  });

  it("keeps declared sizing where the layout holds no usable width", async () => {
    const layout = columns();
    layout.setOverride("status", { kind: "fixed", px: 90 });
    const preferences = {
      [spellWidthKey("name")]: -5,
      [spellWidthKey("status")]: Number.NaN,
      [spellWidthKey("owner")]: "wide",
    };
    const views = viewsWith(preferences);
    renderHook(() => usePreferredWidths(layout, views));
    // Once the preferences are read, not merely before.
    await waitFor(() => {
      expect(views.state.get().presentation).toEqual(preferences);
    });
    expect(layout.state.get().overrides).toEqual({});
  });

  it("observes once and saves a resize once under StrictMode's double mount", async () => {
    const layout = columns();
    const patchPresentation = vi.fn<ViewStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const views = viewsWith(
      { [spellWidthKey("name")]: 150 },
      patchPresentation,
    );
    const observe = vi.spyOn(views, "observe");
    const { unmount } = renderHook(() => usePreferredWidths(layout, views), {
      wrapper: StrictMode,
    });
    await waitFor(() => {
      expect(layout.state.get().overrides).toEqual({
        name: { kind: "fixed", px: 150 },
      });
    });
    // The first mount's observation was released by its own cleanup.
    expect(observe).toHaveBeenCalledTimes(2);
    act(() => {
      layout.setOverride("name", { kind: "fixed", px: 220 });
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(1);
    });
    unmount();
    act(() => {
      layout.setOverride("name", { kind: "fixed", px: 300 });
    });
    expect(patchPresentation).toHaveBeenCalledTimes(1);
  });

  it("saves a committed resize, and a reset, as the viewer's arrangement", async () => {
    const layout = columns();
    const patchPresentation = vi.fn<ViewStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const views = viewsWith({}, patchPresentation);
    renderHook(() => usePreferredWidths(layout, views));
    act(() => {
      layout.setOverride("name", { kind: "fixed", px: 220 });
    });
    expect(views.state.get().presentation).toEqual({
      [spellWidthKey("name")]: 220,
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [spellWidthKey("name")]: 220,
      });
    });
    act(() => {
      layout.resetOverride("name");
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [spellWidthKey("name")]: null,
      });
    });
    expect(views.state.get().presentation).toEqual({
      [spellWidthKey("name")]: null,
    });
    // A width that is not fixed cannot be kept: the column is reset.
    act(() => {
      layout.setOverride("name", { kind: "fixed", px: 220 });
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [spellWidthKey("name")]: 220,
      });
    });
    act(() => {
      layout.setOverride("name", { kind: "flex", weight: 2, minPx: 96 });
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [spellWidthKey("name")]: null,
      });
    });
  });

  it("saves a resize once when two tables share one layout", async () => {
    const layout = columns();
    const views = viewsWith({ [spellWidthKey("status")]: 90 });
    const arrange = vi.spyOn(views, "arrange");
    renderHook(() => usePreferredWidths(layout, views));
    renderHook(() => usePreferredWidths(layout, views));
    await waitFor(() => {
      expect(layout.state.get().overrides).toEqual({
        status: { kind: "fixed", px: 90 },
      });
    });
    // Applying the collection's widths is not a resize: nothing is saved.
    expect(arrange).not.toHaveBeenCalled();
    act(() => {
      layout.setOverride("name", { kind: "fixed", px: 220 });
    });
    expect(arrange.mock.calls).toEqual([[{ [spellWidthKey("name")]: 220 }]]);
  });

  it("stops following both once unmounted", () => {
    const layout = columns();
    const views = viewsWith({});
    const { unmount } = renderHook(() => usePreferredWidths(layout, views));
    unmount();
    layout.setOverride("name", { kind: "fixed", px: 220 });
    expect(views.state.get().presentation).toEqual({});
    views.arrange({ [spellWidthKey("status")]: 90 });
    expect(layout.state.get().overrides).toEqual({
      name: { kind: "fixed", px: 220 },
    });
  });
});
