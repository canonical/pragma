import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { ResizeHandleProps } from "./types.js";

const componentCssClassName = "ds data-table-resize";

/** How far one keyboard step moves a column edge. */
const KEYBOARD_STEP = 16;

/**
 * Scroll the table the control sits in — that one container, nothing above
 * it — just far enough that the control is inside the table's visible width.
 * A column widened past the container pushes its own edge out of view, and
 * the reader must never lose the edge they are moving.
 */
const reveal = (control: HTMLElement): void => {
  const table = control.closest<HTMLElement>('[role="table"]');
  if (table === null) {
    return;
  }
  const edge = control.getBoundingClientRect();
  const start = table.getBoundingClientRect().left + table.clientLeft;
  const end = start + table.clientWidth;
  if (edge.right > end) {
    table.scrollLeft += edge.right - end;
  } else if (edge.left < start) {
    table.scrollLeft -= start - edge.left;
  }
};

/**
 * One column's resize control.
 *
 * Pointer dragging and the keyboard drive the same commands and the same
 * clamping, so resizing never requires a drag: arrow keys step the edge and
 * Escape abandons a drag in progress, as a cancelled pointer does. Every path
 * is held to the column's declared bounds, however often the column has been
 * resized before, and every move keeps the control in view. Pointer previews
 * are coalesced to one geometry publication per animation frame.
 */
export default function ResizeHandle({
  interaction,
  columnId,
  width,
  min,
  max,
  labelledBy,
}: ResizeHandleProps): ReactElement {
  // The live drag's teardown, held across the re-renders its own previews
  // cause: listeners registered by one render must be removed by the same
  // closure, not by whatever identity the next render produces.
  const teardown = useRef<(() => void) | null>(null);
  // The control whose edge just moved, until the render showing the move has
  // brought it into view. A drag in progress keeps it set.
  const moved = useRef<HTMLElement | null>(null);

  const clamp = (next: number): number => Math.min(max, Math.max(min, next));

  useLayoutEffect(() => {
    const control = moved.current;
    if (control === null) {
      return;
    }
    if (teardown.current === null) {
      moved.current = null;
    }
    reveal(control);
  });

  const abandonDrag = (): void => {
    teardown.current?.();
    teardown.current = null;
  };

  useEffect(
    () => () => {
      teardown.current?.();
      teardown.current = null;
    },
    [],
  );

  const beginDrag = (control: HTMLElement, clientX: number): void => {
    // A second pointer can go down before the first comes up — trivially,
    // on touch. The drag already running is abandoned here rather than
    // stranding its three window listeners and a pending frame.
    abandonDrag();
    moved.current = control;
    interaction.startResize(columnId, clientX, width);
    let frame = 0;
    let latestX = clientX;

    const onPointerMove = (event: PointerEvent): void => {
      latestX = event.clientX;
      if (frame !== 0) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        // The pointer is translated to the position that lands on the
        // clamped width, so the edge stops at a bound and stays there.
        interaction.preview(clientX + clamp(width + latestX - clientX) - width);
      });
    };
    const onPointerUp = (): void => {
      abandonDrag();
      interaction.commit();
    };
    const onPointerCancel = (): void => {
      abandonDrag();
      interaction.cancel();
    };
    const stop = (): void => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    teardown.current = stop;
  };

  const step = (control: HTMLElement, delta: number): void => {
    const next = clamp(width + delta);
    if (Math.abs(next - width) < 0.5) {
      // At a bound, to within the solver's rounding: nothing moves, and
      // nothing is committed.
      return;
    }
    moved.current = control;
    interaction.startResize(columnId, 0, width);
    interaction.preview(next - width);
    interaction.commit();
  };

  return (
    // A separator with a value is the resizer's role; it takes its name from
    // the column header it sits in rather than repeating the column's name.
    // biome-ignore lint/a11y/useSemanticElements: <hr>, the semantic separator, cannot carry the resizer's focus, keyboard handlers or aria-valuenow
    <div
      role="separator"
      className={componentCssClassName}
      tabIndex={0}
      aria-orientation="vertical"
      aria-labelledby={labelledBy}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={Number.isFinite(max) ? max : undefined}
      aria-valuetext={`${Math.round(width)} pixels`}
      onPointerDown={(event) => {
        beginDrag(event.currentTarget, event.clientX);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          step(event.currentTarget, -KEYBOARD_STEP);
        } else if (event.key === "ArrowRight") {
          step(event.currentTarget, KEYBOARD_STEP);
        } else if (event.key === "Escape") {
          abandonDrag();
          interaction.cancel();
        } else {
          return;
        }
        event.preventDefault();
      }}
    />
  );
}
