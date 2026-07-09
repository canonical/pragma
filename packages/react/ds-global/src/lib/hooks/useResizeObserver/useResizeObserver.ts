import { useEffect, useLayoutEffect, useState } from "react";
import type { UseResizeObserverResult } from "./types.js";

// `useLayoutEffect` logs a warning on the server ("does nothing on the server"),
// so fall back to `useEffect` there. On the client we keep the pre-paint
// measurement so the consumer settles in one pass (no mount-at-0×0 flicker).
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Hook to observe the size of an element.
 *
 * The initial measurement is taken synchronously in a layout effect (before the
 * browser paints), so a consumer that positions itself from this size settles in
 * a single pre-paint pass rather than mounting at 0×0 and visibly jumping into
 * place once the async ResizeObserver first fires. The observer then handles all
 * subsequent size changes.
 * @param element The element to observe.
 * @returns The size of the element.
 */
export default function useResizeObserver<TElement extends HTMLElement>(
  element?: TElement | null,
): UseResizeObserverResult {
  const [size, setSize] = useState<UseResizeObserverResult>({
    width: 0,
    height: 0,
  });
  const isServer = typeof window === "undefined";

  useIsomorphicLayoutEffect(() => {
    if (!element || isServer) return;

    // Seed the size synchronously before paint so the first committed frame has
    // the real dimensions (avoids the mount-at-0×0 reposition flicker).
    const initial = element.getBoundingClientRect();
    setSize((prev) =>
      prev.width === initial.width && prev.height === initial.height
        ? prev
        : { width: initial.width, height: initial.height },
    );

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        // Report the BORDER-BOX size, to match the layout-effect seed
        // (getBoundingClientRect is border-box) and the positioning math, which
        // reads border-box rects everywhere. `entry.contentRect` excludes
        // padding and border, so using it would report a box narrower by the
        // horizontal padding — which then miscentres anything derived from the
        // width (e.g. the arrow offset lands ~half-a-padding off-centre).
        const border = entry.borderBoxSize?.[0];
        const size = border
          ? { width: border.inlineSize, height: border.blockSize }
          : {
              width: element.getBoundingClientRect().width,
              height: element.getBoundingClientRect().height,
            };
        // Skip updates that don't change the dimensions. The observer fires once
        // immediately on observe() with a fresh object; bailing on equal values
        // avoids a redundant re-render (and, downstream, a redundant reposition).
        setSize((prev) =>
          prev.width === size.width && prev.height === size.height
            ? prev
            : size,
        );
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, isServer]);

  return size;
}
