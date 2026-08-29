/**
 * Fan one element out to several refs, so a component can keep its own internal
 * ref while still honouring a forwarded one. Accepts both callback refs and ref
 * objects, and ignores `undefined` entries, so an optional forwarded ref can be
 * passed straight through.
 *
 * @example
 *   <input ref={mergeRefs(internalRef, forwardedRef)} />
 *
 * @note Pure — returns a new callback ref; the returned callback is impure by
 * necessity, since assigning the element to each ref is its whole purpose.
 */
export default function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): (instance: T | null) => void {
  return (instance: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref) {
        (ref as React.RefObject<T | null>).current = instance;
      }
    }
  };
}
