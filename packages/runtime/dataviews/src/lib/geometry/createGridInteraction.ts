import { createChannel, type ReadonlyChannel } from "../observable/index.js";
import type { ColumnLayout } from "./createColumnLayout.js";
import sizingEquals from "./sizingEquals.js";
import type { ColumnSizing } from "./types.js";

/** The grid interaction state: idle, or one live resize preview. */
export type GridInteractionState =
  | { readonly status: "idle" }
  | {
      readonly status: "resizing";
      readonly columnId: string;
      readonly originX: number;
      readonly startWidth: number;
      readonly previewWidth: number;
    };

/** Handle of one grid interaction record. */
export type GridInteraction = {
  /** The interaction's snapshots; immutable between publications. */
  readonly state: ReadonlyChannel<GridInteractionState>;
  /**
   * Begin a resize: capture the column, the pointer origin and the current
   * (resolved) starting width. Previews never mutate the authoritative
   * layout.
   */
  readonly startResize: (
    columnId: string,
    originX: number,
    startWidth: number,
  ) => void;
  /** Preview a pointer position; the width is clamped to the column's bounds. */
  readonly preview: (pointerX: number) => void;
  /** Commit the preview: the sizing override is applied to the layout. */
  readonly commit: () => void;
  /** Cancel: the authoritative layout is untouched, so nothing restores. */
  readonly cancel: () => void;
  /**
   * Begin watching the layout for the conflicting external changes
   * that invalidate a live preview; the return value detaches. Construction
   * subscribes to nothing, so an interaction whose caller never attaches it
   * holds no subscription to leak, and re-attaching is an ordinary second
   * call.
   */
  readonly observe: () => () => void;
};

/**
 * Create the grid interaction record for one table's resize lifecycle,
 * bound to its layout record. A conflicting same-column update
 * invalidates the live preview; unrelated column updates are incorporated.
 * Preview coalescing to animation frames is the renderer's concern — the
 * machine clamps and publishes per preview call.
 */
export default function createGridInteraction(
  layout: ColumnLayout,
): GridInteraction {
  const channel = createChannel<GridInteractionState>(
    Object.freeze({ status: "idle" }),
  );
  // The sizing the live preview was captured against, for conflict checks.
  let resizingBaseline: ColumnSizing | null = null;

  const publish = (next: GridInteractionState): void => {
    channel.set(Object.freeze(next));
  };

  const clamp = (columnId: string, width: number): number => {
    const sizing = layout.effective(columnId);
    let next = Math.max(0, width);
    if (sizing.kind === "flex") {
      next = Math.max(sizing.minPx, next);
      if (sizing.maxPx !== undefined) {
        next = Math.min(sizing.maxPx, next);
      }
    }
    return next;
  };

  // A conflicting same-column update invalidates the live preview; an
  // unrelated column's update does not. Our own commit ends the interaction
  // before writing, so any change observed while resizing is external.
  const onLayoutChange = (): void => {
    const state = channel.get();
    if (state.status === "resizing" && resizingBaseline !== null) {
      const current = layout.effective(state.columnId);
      if (!sizingEquals(current, resizingBaseline)) {
        resizingBaseline = null;
        publish({ status: "idle" });
      }
    }
  };

  return {
    state: channel,
    startResize(columnId: string, originX: number, startWidth: number): void {
      resizingBaseline = layout.effective(columnId);
      publish({
        status: "resizing",
        columnId,
        originX,
        startWidth,
        previewWidth: clamp(columnId, startWidth),
      });
    },
    preview(pointerX: number): void {
      const state = channel.get();
      if (state.status !== "resizing") {
        return;
      }
      const previewWidth = clamp(
        state.columnId,
        state.startWidth + (pointerX - state.originX),
      );
      if (previewWidth === state.previewWidth) {
        // A pointer moving on past a bound lands on the same width every
        // frame; republishing it would redraw every column for no change.
        return;
      }
      publish({ ...state, previewWidth });
    },
    commit(): void {
      const state = channel.get();
      if (state.status !== "resizing") {
        return;
      }
      const { columnId, previewWidth } = state;
      resizingBaseline = null;
      publish({ status: "idle" });
      layout.setOverride(columnId, {
        kind: "fixed",
        px: previewWidth,
      });
    },
    cancel(): void {
      if (channel.get().status !== "resizing") {
        return;
      }
      resizingBaseline = null;
      publish({ status: "idle" });
    },
    observe(): () => void {
      return layout.state.subscribe(onLayoutChange);
    },
  };
}
