import type { Ref } from "react";
import { useCallback, useRef } from "react";
import applyRef from "./applyRef.js";

/**
 * One callback ref that serves the caller and the part at once: the node
 * reaches the caller's ref in whichever form it arrives, and the part's own
 * `attach` runs beside it. On detach the part's cleanup runs first, then the
 * caller's — its own if its callback returned one, otherwise the `null` call
 * React 19 no longer makes on its own.
 *
 * The caller's ref is held behind one identity, so a caller rebuilding it
 * every render never costs a re-attach. Convention: a part that holds its
 * own root merges the caller's ref, never drops it.
 */
export default function useMergedRef<TElement>(
  ref: Ref<TElement> | undefined,
  attach: (node: TElement) => (() => void) | void,
): (node: TElement) => () => void {
  const callerRef = useRef(ref);
  callerRef.current = ref;
  return useCallback(
    (node: TElement) => {
      const detach = attach(node);
      const attached = callerRef.current;
      const releaseCaller = applyRef(attached, node);
      return () => {
        detach?.();
        if (releaseCaller === undefined) {
          applyRef(attached, null);
        } else {
          releaseCaller();
        }
      };
    },
    [attach],
  );
}
