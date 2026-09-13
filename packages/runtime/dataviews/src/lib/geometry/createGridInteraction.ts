import { createChannel } from "../observable/index.js";
import areSizingsEqual from "./areSizingsEqual.js";
import type {
  ColumnLayout,
  ColumnSizing,
  GridInteraction,
  GridInteractionState,
} from "./types.js";

/**
 * Create the grid interaction record for one table's resize lifecycle,
 * bound to its layout record. A conflicting same-column update
 * invalidates the live preview; unrelated column updates are incorporated.
 * Preview coalescing to animation frames is the renderer's concern — the
 * machine clamps and publishes per preview call.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
      if (!areSizingsEqual(current, resizingBaseline)) {
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
