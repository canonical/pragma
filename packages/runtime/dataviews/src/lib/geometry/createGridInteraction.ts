import type { Presentation } from "./createPresentation.js";
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
  readonly state: GridInteractionState;
  /** Observe interaction changes. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * Begin a resize: capture the column, the pointer origin and the current
   * (resolved) starting width. Previews never mutate the authoritative
   * presentation.
   */
  readonly startResize: (
    columnId: string,
    originX: number,
    startWidth: number,
  ) => void;
  /** Preview a pointer position; the width is clamped to the column's bounds. */
  readonly preview: (pointerX: number) => void;
  /** Commit the preview: the sizing override is applied to the presentation. */
  readonly commit: () => void;
  /** Cancel: the authoritative presentation is untouched, so nothing restores. */
  readonly cancel: () => void;
  /**
   * Begin watching the presentation for the conflicting external changes
   * that invalidate a live preview; the return value detaches. Construction
   * subscribes to nothing, so an interaction whose caller never attaches it
   * holds no subscription to leak, and re-attaching is an ordinary second
   * call.
   */
  readonly observe: () => () => void;
};

/**
 * Create the grid interaction record for one table's resize lifecycle,
 * bound to its presentation record. A conflicting same-column update
 * invalidates the live preview; unrelated column updates are incorporated.
 * Preview coalescing to animation frames is the renderer's concern — the
 * machine clamps and publishes per preview call.
 */
export default function createGridInteraction(
  presentation: Presentation,
): GridInteraction {
  let state: GridInteractionState = { status: "idle" };
  const listeners = new Set<() => void>();
  // The sizing the live preview was captured against, for conflict checks.
  let resizingBaseline: ColumnSizing | null = null;

  const publish = (next: GridInteractionState): void => {
    state = Object.freeze(next);
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const clamp = (columnId: string, width: number): number => {
    const sizing = presentation.effective(columnId);
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
  const onPresentationChange = (): void => {
    if (state.status === "resizing" && resizingBaseline !== null) {
      const current = presentation.effective(state.columnId);
      if (!sizingEquals(current, resizingBaseline)) {
        resizingBaseline = null;
        publish({ status: "idle" });
      }
    }
  };

  return {
    get state(): GridInteractionState {
      return state;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    startResize(columnId: string, originX: number, startWidth: number): void {
      resizingBaseline = presentation.effective(columnId);
      publish({
        status: "resizing",
        columnId,
        originX,
        startWidth,
        previewWidth: clamp(columnId, startWidth),
      });
    },
    preview(pointerX: number): void {
      if (state.status !== "resizing") {
        return;
      }
      publish({
        ...state,
        previewWidth: clamp(
          state.columnId,
          state.startWidth + (pointerX - state.originX),
        ),
      });
    },
    commit(): void {
      if (state.status !== "resizing") {
        return;
      }
      const { columnId, previewWidth } = state;
      resizingBaseline = null;
      publish({ status: "idle" });
      presentation.setOverride(columnId, {
        kind: "fixed",
        px: previewWidth,
      });
    },
    cancel(): void {
      if (state.status !== "resizing") {
        return;
      }
      resizingBaseline = null;
      publish({ status: "idle" });
    },
    observe(): () => void {
      return presentation.subscribe(onPresentationChange);
    },
  };
}
