import { useCallback, useEffect, useId, useSyncExternalStore } from "react";
import useRouter from "./useRouter.js";

export interface BlockerState {
  readonly state: "idle" | "blocked";
  proceed(): void;
  cancel(): void;
}

/**
 * Block navigation when the component has unsaved state.
 *
 * Returns a state object: `state` is `"idle"` or `"blocked"`, `proceed()`
 * continues the blocked navigation, and `cancel()` stays on the page.
 * The consumer controls the confirmation UI.
 *
 * ```tsx
 * const blocker = useBlocker(isDirty);
 *
 * {blocker.state === "blocked" && (
 *   <Dialog>
 *     <button onClick={blocker.proceed}>Leave</button>
 *     <button onClick={blocker.cancel}>Stay</button>
 *   </Dialog>
 * )}
 * ```
 */
export default function useBlocker(isActive: boolean): BlockerState {
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    router.registerBlocker({ id, isActive: () => isActive });

    return () => {
      router.unregisterBlocker(id);
    };
  }, [router, id, isActive]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => router.subscribe(onStoreChange),
    [router],
  );

  const getSnapshot = useCallback(() => router.blockerState, [router]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    state,
    proceed() {
      router.proceedNavigation();
    },
    cancel() {
      router.cancelNavigation();
    },
  };
}
