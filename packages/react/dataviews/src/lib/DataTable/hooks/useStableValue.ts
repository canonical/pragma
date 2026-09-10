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
  const held = useRef(value);
  if (held.current !== value && !equals(held.current, value)) {
    held.current = value;
  }
  return held.current;
}
