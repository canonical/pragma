import type { Ref } from "react";

/**
 * Hand a node to the caller's ref, in whichever form it arrives, and report
 * back the cleanup a callback ref returned. React 19 ref callbacks may
 * return one, and a caller that does gets it called on detach instead of
 * the `null` call React 19 no longer makes on its own.
 *
 * Shared by every part that holds its own root: the caller's ref is merged
 * with the part's, never dropped.
 */
export default function applyRef<TElement>(
  ref: Ref<TElement> | undefined,
  node: TElement | null,
): (() => void) | undefined {
  if (typeof ref === "function") {
    const cleanup = ref(node);
    return typeof cleanup === "function" ? cleanup : undefined;
  }
  if (ref) {
    ref.current = node;
  }
  return undefined;
}
