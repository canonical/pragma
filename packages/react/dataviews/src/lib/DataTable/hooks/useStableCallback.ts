import { useCallback, useRef } from "react";

/**
 * Hold a caller's function behind one stable identity.
 *
 * A table prop written as a lambda is a new function on every render, and
 * every memoised row and cell below it would re-render for that alone. The
 * latest one is always called, so the caller's API is unchanged; what it
 * loses is a re-render caused by the function's identity, which is the
 * point. A caller that changes what its function does therefore sees the
 * change wherever the value is next read, not through a render of its own.
 */
export default function useStableCallback<
  TArgs extends readonly unknown[],
  TResult,
>(callback: (...args: TArgs) => TResult): (...args: TArgs) => TResult {
  const held = useRef(callback);
  held.current = callback;
  return useCallback((...args: TArgs) => held.current(...args), []);
}
