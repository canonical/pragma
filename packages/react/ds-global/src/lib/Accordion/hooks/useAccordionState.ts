import { useCallback, useMemo, useRef } from "react";
import type { HeaderRef, UseAccordionStateResult } from "./types.js";

/**
 * Hook to manage accordion keyboard navigation state.
 *
 * Implements WAI-ARIA Accordion Pattern keyboard interactions:
 * - Arrow Down: Move focus to next accordion header
 * - Arrow Up: Move focus to previous accordion header
 * - Home: Move focus to first accordion header
 * - End: Move focus to last accordion header
 */
const useAccordionState = (): UseAccordionStateResult => {
  const headersRef = useRef<HeaderRef[]>([]);

  const registerHeader = useCallback((ref: HeaderRef) => {
    headersRef.current.push(ref);

    // Return cleanup function
    return () => {
      const index = headersRef.current.indexOf(ref);
      if (index > -1) {
        headersRef.current.splice(index, 1);
      }
    };
  }, []);

  const handleKeyNavigation = useCallback(
    (event: React.KeyboardEvent, currentRef: HeaderRef) => {
      const headers = headersRef.current;
      const currentIndex = headers.indexOf(currentRef);

      if (currentIndex === -1) return;

      let targetIndex: number | null = null;

      switch (event.key) {
        case "ArrowDown":
          targetIndex = (currentIndex + 1) % headers.length;
          break;
        case "ArrowUp":
          targetIndex = (currentIndex - 1 + headers.length) % headers.length;
          break;
        case "Home":
          targetIndex = 0;
          break;
        case "End":
          targetIndex = headers.length - 1;
          break;
        default:
          return;
      }

      if (targetIndex !== null && targetIndex !== currentIndex) {
        event.preventDefault();
        headers[targetIndex]?.current?.focus();
      }
    },
    [],
  );

  return useMemo(
    () => ({
      registerHeader,
      handleKeyNavigation,
    }),
    [registerHeader, handleKeyNavigation],
  );
};

export default useAccordionState;
