import { useLayoutEffect, useState } from "react";
import type { UseResizeObserverResult } from "./types.js";

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

  useLayoutEffect(() => {
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
        const rect = entry.contentRect;
        setSize({
          width: rect.width,
          height: rect.height,
        });
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, isServer]);

  return size;
}
