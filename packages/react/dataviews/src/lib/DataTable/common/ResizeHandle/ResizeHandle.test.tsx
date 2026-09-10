/**
 * Resizing must never require a drag, must clamp every path the same way,
 * and must leave the authoritative presentation alone until it commits.
 * Pointer previews are coalesced to one publication per animation frame.
 */
import type { GridInteraction, Presentation } from "@canonical/dataviews-core";
import {
  createGridInteraction,
  createPresentation,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResizeHandle from "./ResizeHandle.js";

let frames: FrameRequestCallback[] = [];
let cancelled: number[] = [];

const flushFrames = (): void => {
  const pending = [...frames];
  frames = [];
  act(() => {
    for (const frame of pending) {
      frame(0);
    }
  });
};

const movePointer = (clientX: number): void => {
  fireEvent.pointerMove(window, { clientX });
};

const releasePointer = (type: "pointerUp" | "pointerCancel"): void => {
  fireEvent[type](window);
};

const mount = ({
  width = 100,
}: {
  readonly width?: number;
} = {}): {
  presentation: Presentation;
  interaction: GridInteraction;
  handle: HTMLElement;
} => {
  const presentation = createPresentation([
    { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50, maxPx: 300 } },
  ]);
  const interaction = createGridInteraction(presentation);
  render(
    <>
      <span id="name-label">Name</span>
      <ResizeHandle
        interaction={interaction}
        columnId="name"
        width={width}
        min={50}
        max={300}
        labelledBy="name-label"
      />
    </>,
  );
  return { presentation, interaction, handle: screen.getByRole("separator") };
};

beforeEach(() => {
  frames = [];
  cancelled = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
    cancelled.push(handle);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResizeHandle", () => {
  it("takes its name from the column header it sits in", () => {
    const { handle } = mount();
    expect(handle).toHaveAccessibleName("Name");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "100");
    expect(handle.tabIndex).toBe(0);
  });

  it("previews a drag and commits it as a user-fixed width", () => {
    const { presentation, interaction, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    expect(interaction.state.status).toBe("resizing");
    movePointer(160);
    flushFrames();
    expect(interaction.state).toMatchObject({ previewWidth: 160 });
    // The authority is untouched while the preview is live.
    expect(presentation.state.overrides.name).toBeUndefined();
    releasePointer("pointerUp");
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 160 });
    expect(interaction.state.status).toBe("idle");
  });

  it("publishes at most one preview per animation frame", () => {
    const { interaction, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(140);
    movePointer(180);
    expect(frames).toHaveLength(1);
    flushFrames();
    expect(interaction.state).toMatchObject({ previewWidth: 180 });
  });

  it("clamps a drag to the column's declared bounds", () => {
    const { presentation, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(1000);
    flushFrames();
    releasePointer("pointerUp");
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 300 });
  });

  it("abandons the drag when the pointer is cancelled", () => {
    const { presentation, interaction, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(160);
    flushFrames();
    releasePointer("pointerCancel");
    expect(interaction.state.status).toBe("idle");
    expect(presentation.state.overrides.name).toBeUndefined();
  });

  it("drops a pending frame when the drag ends before it runs", () => {
    const { handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(160);
    expect(frames).toHaveLength(1);
    releasePointer("pointerUp");
    expect(cancelled).toHaveLength(1);
  });

  it("stops listening once the drag is over", () => {
    const { interaction, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    releasePointer("pointerUp");
    movePointer(400);
    flushFrames();
    expect(interaction.state.status).toBe("idle");
  });

  it("abandons a live drag on Escape", () => {
    const { presentation, interaction, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(160);
    flushFrames();
    fireEvent.keyDown(handle, { key: "Escape" });
    expect(interaction.state.status).toBe("idle");
    expect(presentation.state.overrides.name).toBeUndefined();
    // The listeners went with it.
    movePointer(400);
    flushFrames();
    expect(interaction.state.status).toBe("idle");
  });

  it("does nothing on Escape with no drag in progress", () => {
    const { presentation, interaction, handle } = mount();
    fireEvent.keyDown(handle, { key: "Escape" });
    expect(interaction.state.status).toBe("idle");
    expect(presentation.state.overrides.name).toBeUndefined();
  });

  it("resizes from the keyboard through the same commands", () => {
    const { presentation, handle } = mount();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 116 });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 84 });
  });

  it("leaves other keys to whatever else wants them", () => {
    const { presentation, interaction, handle } = mount();
    const event = fireEvent.keyDown(handle, { key: "a" });
    expect(event).toBe(true);
    expect(interaction.state.status).toBe("idle");
    expect(presentation.state.overrides.name).toBeUndefined();
  });

  it("abandons a running drag when a second pointer goes down", () => {
    const { interaction, handle } = mount();
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerDown(handle, { clientX: 200 });
    movePointer(260);
    // One drag is live, not two: the first drag's listeners went with it.
    expect(frames).toHaveLength(1);
    flushFrames();
    expect(interaction.state).toMatchObject({ previewWidth: 160 });
    releasePointer("pointerUp");
    movePointer(400);
    flushFrames();
    expect(interaction.state.status).toBe("idle");
  });

  it("abandons a drag the unmounting table can no longer finish", () => {
    const presentation = createPresentation([
      { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50 } },
    ]);
    const interaction = createGridInteraction(presentation);
    const { unmount } = render(
      <ResizeHandle
        interaction={interaction}
        columnId="name"
        width={100}
        min={50}
        max={Number.POSITIVE_INFINITY}
        labelledBy="name-label"
      />,
    );
    fireEvent.pointerDown(screen.getByRole("separator"), { clientX: 100 });
    unmount();
    movePointer(400);
    flushFrames();
    expect(presentation.state.overrides.name).toBeUndefined();
  });

  it("reports the bounds it holds the column to", () => {
    const { handle } = mount();
    expect(handle).toHaveAttribute("aria-valuemin", "50");
    expect(handle).toHaveAttribute("aria-valuemax", "300");
    // Without a maximum ARIA would imply 100, so the width is also spoken.
    expect(handle).toHaveAttribute("aria-valuetext", "100 pixels");
  });

  it("holds a later resize to the declared bounds, not to the override", () => {
    const { presentation, handle } = mount();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    // The first resize committed a fixed override, which carries no bounds
    // of its own: the declared ones must still hold every later drag.
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 116 });
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(1000);
    flushFrames();
    releasePointer("pointerUp");
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 300 });
    fireEvent.pointerDown(handle, { clientX: 100 });
    movePointer(-1000);
    flushFrames();
    releasePointer("pointerUp");
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 50 });
  });

  it("steps no further than a bound, after an override too", () => {
    const { presentation, handle } = mount({ width: 290 });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    // The column now carries a fixed override with no bounds of its own.
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 274 });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 300 });
  });

  it("commits nothing at a bound, and still owns the key", () => {
    const { presentation, handle } = mount({ width: 300 });
    expect(fireEvent.keyDown(handle, { key: "ArrowRight" })).toBe(false);
    expect(presentation.state.overrides.name).toBeUndefined();
  });

  it("reveals nothing outside a table, through a drag and after it", () => {
    const presentation = createPresentation([
      { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50 } },
    ]);
    const interaction = createGridInteraction(presentation);
    const view = (width: number) => (
      <ResizeHandle
        interaction={interaction}
        columnId="name"
        width={width}
        min={50}
        max={Number.POSITIVE_INFINITY}
        labelledBy="name-label"
      />
    );
    const { rerender } = render(view(100));
    const handle = screen.getByRole("separator");
    expect(handle).not.toHaveAttribute("aria-valuemax");
    fireEvent.pointerDown(handle, { clientX: 100 });
    rerender(view(120));
    releasePointer("pointerUp");
    rerender(view(140));
    rerender(view(160));
    expect(interaction.state.status).toBe("idle");
  });
});
