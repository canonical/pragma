import { useRef } from "react";

/**
 * Hold a value rebuilt every render at one stable reference.
 *
 * The package's answer to referential stability, and the router's:
 * `useRouterState` keeps its selection the same way. The previously held
 * reference is returned for as long as the new value equals it, so a memo,
 * a subscription or a memoised child keyed on the value is not rebuilt
 * because a caller wrote an array literal in its own render.
 */
export default function useStableValue<TValue>(
  value: TValue,
  equals: (held: TValue, next: TValue) => boolean,
): TValue {
  // Written during render: the write is idempotent for one value, so a
  // render React discards leaves the ref as the committed one would.
  const held = useRef(value);
  if (held.current !== value && !equals(held.current, value)) {
    held.current = value;
  }
  return held.current;
}
