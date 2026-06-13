import { useEffect, useState } from "react";
import type { UseIsMountedResult } from "./types.js";

/**
 * Returns `false` during server rendering and the initial client render,
 * then `true` once the component has mounted.
 *
 * Useful for deferring client-only output (such as portals) until after
 * hydration, so the first client render matches the server-rendered HTML.
 */
const useIsMounted = (): UseIsMountedResult => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};

export default useIsMounted;
