import { debounce } from "@canonical/ds-utils";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type {
  UseWindowDimensionProps,
  UseWindowDimensionsResult,
} from "./types.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Hook to get the window dimensions and scroll position.
 */
export default function useWindowDimensions({
  enabled = true,
  listenToScroll = true,
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

  // When a popup is closed, listeners are intentionally absent. Refresh the
  // viewport synchronously on reopening so fitment does not use dimensions
  // from before a resize for its first visible frame.
  useIsomorphicLayoutEffect(() => {
    if (isServer || !enabled) return;
    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);
  }, [isServer, enabled]);

  useEffect(() => {
    if (isServer || !enabled) return;
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
    if (listenToScroll) window.addEventListener("scroll", handleScroll);

    // The visual viewport changes on pinch-zoom (and on-screen keyboards) WITHOUT
    // firing a window `resize`, so anything positioned from viewport bounds would
    // otherwise go stale on zoom. Its `resize`/`scroll` cover that. (Ctrl +/-
    // page zoom already fires the window `resize` above, so it is covered too.)
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", handleResize);
    if (listenToScroll) viewport?.addEventListener("scroll", handleScroll);

    // The layout effect above performs the initial dimension refresh without
    // waiting for the resize debounce. Scroll position remains event-driven.
    if (listenToScroll) void handleScroll();

    return () => {
      handleResize.cancel();
      handleScroll.cancel();
      window.removeEventListener("resize", handleResize);
      if (listenToScroll) window.removeEventListener("scroll", handleScroll);
      viewport?.removeEventListener("resize", handleResize);
      if (listenToScroll) viewport?.removeEventListener("scroll", handleScroll);
    };
  }, [
    enabled,
    listenToScroll,
    onResize,
    onScroll,
    resizeDelay,
    scrollDelay,
    result,
    isServer,
  ]);

  return result;
}
