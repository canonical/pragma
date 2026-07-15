import { useEffect, useState } from "react";
import type { UseIsMountedResult } from "./types.js";

/**
 * Reports whether the component has mounted on the client.
 *
 * Returns `false` during server rendering and the initial client render, then
 * `true` after the mount effect runs. Gate client-only output — portals in
 * particular — on this so the server-rendered HTML and the first client render
 * are identical and hydration does not mismatch.
 *
 * @returns `false` until mounted, then `true`.
 * @note Impure — schedules a mount effect that updates component state.
 */
const useIsMounted = (): UseIsMountedResult => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};

export default useIsMounted;
