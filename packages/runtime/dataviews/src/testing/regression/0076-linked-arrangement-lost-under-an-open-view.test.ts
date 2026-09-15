/**
 * Regression: the columns a followed link chose were lost under an open view,
 * and a store's first read undid them.
 *
 * Before the fix, the arrangement a link carries was restored beneath the
 * view layers: under a view saved with a column hidden, following "Show" left
 * the column hidden once the view was shown, and with a store the first read
 * replaced the link's columns with the stored ones. The link's arrangement is
 * now drawn over every layer, and once observed it is the viewer's own change
 * to the view the link named, written to the store, which no read undoes.
 */

import { describe, expect, it, onTestFinished, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import {
  createPresentation,
  type JsonValue,
  type PresentationStore,
  type ViewPresentation,
  WRITE_DEADLINE,
} from "../../lib/presentation/index.js";

describe("regression 0076 — a linked arrangement lost under an open view", () => {
  it("shows the link's columns over a view saved hiding them, drawn from the first render", () => {
    const presentation = createPresentation({
      linked: { view: "v1", presentation: { "table.hidden": [] } },
    });
    expect(presentation.state.get().presentation).toEqual({
      "table.hidden": [],
    });
    const release = presentation.observe();
    // Still drawn until the view it named is shown.
    expect(presentation.state.get().presentation).toEqual({
      "table.hidden": [],
    });
    presentation.show({
      id: "v1",
      presentation: { "table.hidden": ["status"] },
    });
    expect(presentation.state.get().presentation["table.hidden"]).toEqual([]);
    expect(presentation.state.get().own).toEqual({ "table.hidden": [] });
    // Another view shown: the link was that view's alone.
    presentation.show({
      id: "v2",
      presentation: { "table.hidden": ["status"] },
    });
    expect(presentation.state.get().presentation["table.hidden"]).toEqual([
      "status",
    ]);
    release();
  });

  it("writes the link's columns to the store, and keeps them through its first read and a later one", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    // A store holding Status hidden and a width of its own, which takes what
    // is written to it.
    let stored: ViewPresentation = {
      "table.hidden": ["status"],
      "table.width.name": 80,
    };
    const readPresentation = vi.fn(async () => stored);
    const patchPresentation = vi.fn<PresentationStore["patchPresentation"]>(
      async (_target, patch) => {
        stored = Object.fromEntries(
          Object.entries({ ...stored, ...patch }).filter(
            (entry): entry is [string, JsonValue] => entry[1] !== undefined,
          ),
        );
        return { status: "saved" };
      },
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({
        readPresentation,
        patchPresentation,
      }),
      linked: { view: null, presentation: { "table.hidden": [] } },
    });
    const release = presentation.observe();
    // The read has landed, since its width is drawn, and the link stands.
    await vi.waitFor(() => {
      expect(presentation.state.get().presentation).toEqual({
        "table.hidden": [],
        "table.width.name": 80,
      });
    });
    expect(presentation.state.get().own).toEqual({
      "table.hidden": [],
      "table.width.name": 80,
    });
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
    expect(patchPresentation).toHaveBeenCalledWith("default", {
      "table.hidden": [],
    });
    const reads = readPresentation.mock.calls.length;
    presentation.refresh();
    await vi.waitFor(() => {
      expect(readPresentation.mock.calls.length).toBeGreaterThan(reads);
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(presentation.state.get().presentation).toEqual({
      "table.hidden": [],
      "table.width.name": 80,
    });
    release();
  });

  it("draws the link until it is adopted when a view is shown before anything observes", () => {
    const presentation = createPresentation({
      linked: { view: "v1", presentation: { "table.hidden": [] } },
    });
    presentation.show({
      id: "v1",
      presentation: { "table.hidden": ["status"] },
    });
    expect(presentation.state.get().presentation["table.hidden"]).toEqual([]);
    const release = presentation.observe();
    expect(presentation.state.get().presentation["table.hidden"]).toEqual([]);
    expect(presentation.state.get().own).toEqual({ "table.hidden": [] });
    release();
  });
});
