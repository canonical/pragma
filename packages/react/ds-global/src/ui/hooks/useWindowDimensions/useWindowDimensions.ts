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
  const isServer = typeof window === "undefined";
  const [windowWidth, setWindowWidth] = useState(
    isServer ? 0 : window.innerWidth,
  );
  const [windowHeight, setWindowHeight] = useState(
    isServer ? 0 : window.innerHeight,
  );
  const [scrollHeight, setScrollHeight] = useState(
    isServer ? 0 : window.scrollY,
  );
  const [scrollWidth, setScrollWidth] = useState(isServer ? 0 : window.scrollX);

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
    if (isServer) return;
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
      handleResize.cancel();
      handleScroll.cancel();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [onResize, onScroll, resizeDelay, scrollDelay, result, isServer]);

  return result;
}
