import { useApp } from "ink";
import { useEffect } from "react";

/**
 * Exit the Ink application after the initial render.
 *
 * All pragma TUI views are static — they render a single frame and
 * exit. This hook calls `useApp().exit()` in a `useEffect`, which
 * runs after the first paint. Ink then flushes the frame to stdout
 * and resolves the `waitUntilExit()` promise in the renderInk bridge.
 */
export default function useAutoExit(): void {
  const { exit } = useApp();
  useEffect(() => {
    exit();
  }, [exit]);
}
