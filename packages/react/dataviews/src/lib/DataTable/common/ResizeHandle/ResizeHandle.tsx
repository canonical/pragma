import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import type { ResizeHandleProps } from "./types.js";

const componentCssClassName = "ds data-table-resize";

/** How far one keyboard step moves a column edge. */
const KEYBOARD_STEP = 16;

/**
 * One column's resize control.
 *
 * Pointer dragging and the keyboard drive the same commands and the same
 * clamping, so resizing never requires a drag: arrow keys step the edge and
 * Escape abandons a drag in progress, as a cancelled pointer does. Pointer
 * previews are coalesced to one geometry publication per animation frame.
 */
export default function ResizeHandle({
  interaction,
  columnId,
  width,
  labelledBy,
}: ResizeHandleProps): ReactElement {
  // The live drag's teardown, held across the re-renders its own previews
  // cause: listeners registered by one render must be removed by the same
  // closure, not by whatever identity the next render produces.
  const teardown = useRef<(() => void) | null>(null);

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

  const beginDrag = (clientX: number): void => {
    // A second pointer can go down before the first comes up — trivially,
    // on touch. The drag already running is abandoned here rather than
    // stranding its three window listeners and a pending frame.
    abandonDrag();
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
        interaction.preview(latestX);
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

  const step = (delta: number): void => {
    interaction.startResize(columnId, 0, width);
    interaction.preview(delta);
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
      onPointerDown={(event) => {
        beginDrag(event.clientX);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          step(-KEYBOARD_STEP);
        } else if (event.key === "ArrowRight") {
          step(KEYBOARD_STEP);
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
