/**
 * Column widths kept in the collection's presentation: applied as fixed
 * widths within their declared bounds, and a committed resize saved back.
 */
import {
  createDataViewsProvider,
  createPresentation,
  createSchema,
} from "@canonical/dataviews-core";
import type {
  ProviderViews,
  ViewPresentation,
  ViewStore,
} from "@canonical/dataviews-core/views";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import usePreferredWidths, { widthKey } from "./usePreferredWidths.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed"] },
]);

const columns = () =>
  createPresentation([
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
    const presentation = columns();
    renderHook(() => usePreferredWidths(presentation, null));
    presentation.setOverride("name", { kind: "fixed", px: 150 });
    expect(presentation.state.overrides).toEqual({
      name: { kind: "fixed", px: 150 },
    });
  });

  it("applies the widths the presentation holds, held to their declared bounds", async () => {
    const presentation = columns();
    const views = viewsWith({
      [widthKey("name")]: 900,
      [widthKey("status")]: 60,
    });
    renderHook(() => usePreferredWidths(presentation, views));
    // The hook reads the preferences itself: no views control is needed.
    await waitFor(() => {
      expect(presentation.state.overrides).toEqual({
        name: { kind: "fixed", px: 400 },
        status: { kind: "fixed", px: 80 },
      });
    });
  });

  it("keeps declared sizing where the presentation holds no usable width", async () => {
    const presentation = columns();
    presentation.setOverride("status", { kind: "fixed", px: 90 });
    const preferences = {
      [widthKey("name")]: -5,
      [widthKey("status")]: Number.NaN,
      [widthKey("owner")]: "wide",
    };
    const views = viewsWith(preferences);
    renderHook(() => usePreferredWidths(presentation, views));
    // Once the preferences are read, not merely before.
    await waitFor(() => {
      expect(views.state.get().presentation).toEqual(preferences);
    });
    expect(presentation.state.overrides).toEqual({});
  });

  it("saves a committed resize, and a reset, as the viewer's arrangement", async () => {
    const presentation = columns();
    const patchPresentation = vi.fn<ViewStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const views = viewsWith({}, patchPresentation);
    renderHook(() => usePreferredWidths(presentation, views));
    act(() => {
      presentation.setOverride("name", { kind: "fixed", px: 220 });
    });
    expect(views.state.get().presentation).toEqual({
      [widthKey("name")]: 220,
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [widthKey("name")]: 220,
      });
    });
    act(() => {
      presentation.resetOverride("name");
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [widthKey("name")]: null,
      });
    });
    expect(views.state.get().presentation).toEqual({
      [widthKey("name")]: null,
    });
    // A width that is not fixed cannot be kept: the column is reset.
    act(() => {
      presentation.setOverride("name", { kind: "fixed", px: 220 });
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [widthKey("name")]: 220,
      });
    });
    act(() => {
      presentation.setOverride("name", { kind: "flex", weight: 2, minPx: 96 });
    });
    await waitFor(() => {
      expect(patchPresentation).toHaveBeenLastCalledWith("default", {
        [widthKey("name")]: null,
      });
    });
  });

  it("saves a resize once when two tables share one presentation", async () => {
    const presentation = columns();
    const views = viewsWith({ [widthKey("status")]: 90 });
    const arrange = vi.spyOn(views, "arrange");
    renderHook(() => usePreferredWidths(presentation, views));
    renderHook(() => usePreferredWidths(presentation, views));
    await waitFor(() => {
      expect(presentation.state.overrides).toEqual({
        status: { kind: "fixed", px: 90 },
      });
    });
    // Applying the collection's widths is not a resize: nothing is saved.
    expect(arrange).not.toHaveBeenCalled();
    act(() => {
      presentation.setOverride("name", { kind: "fixed", px: 220 });
    });
    expect(arrange.mock.calls).toEqual([[{ [widthKey("name")]: 220 }]]);
  });

  it("stops following both once unmounted", () => {
    const presentation = columns();
    const views = viewsWith({});
    const { unmount } = renderHook(() =>
      usePreferredWidths(presentation, views),
    );
    unmount();
    presentation.setOverride("name", { kind: "fixed", px: 220 });
    expect(views.state.get().presentation).toEqual({});
    views.arrange({ [widthKey("status")]: 90 });
    expect(presentation.state.overrides).toEqual({
      name: { kind: "fixed", px: 220 },
    });
  });
});
