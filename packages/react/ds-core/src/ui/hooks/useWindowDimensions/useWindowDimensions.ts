import { debounce } from "@canonical/utils";
import { useEffect, useMemo, useState } from "react";
import type {
  UseWindowDimensionProps,
  UseWindowDimensionsResult,
} from "./types.js";

/**
 * Hook to get the window dimensions and scroll position.
 */
export default function useWindowDimensions({
  onResize,
  onScroll,
  resizeDelay = 100,
  scrollDelay = 100,
}: UseWindowDimensionProps = {}): UseWindowDimensionsResult {
  if (typeof window === "undefined") {
    return {
      windowWidth: 0,
      windowHeight: 0,
      scrollWidth: 0,
      scrollHeight: 0,
    };
  }

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [scrollHeight, setScrollHeight] = useState(window.scrollY);
  const [scrollWidth, setScrollWidth] = useState(window.scrollX);

  const result = useMemo(
    () => ({
      windowWidth,
      windowHeight,
      scrollWidth,
      scrollHeight,
    }),
    [windowWidth, windowHeight, scrollWidth, scrollHeight],
  );

  useEffect(() => {
    const handleResize = debounce(() => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
      if (onResize) onResize(result);
    }, resizeDelay);

    const handleScroll = debounce(() => {
      setScrollWidth(window.scrollX);
      setScrollHeight(window.scrollY);
      if (onScroll) onScroll(result);
    }, scrollDelay);

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    // Initial trigger in case the values need to be passed immediately after mount
    void handleResize();
    void handleScroll();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [onResize, onScroll, resizeDelay, scrollDelay, result]);

  return result;
}
