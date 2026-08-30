import type { RouterBlockerHandle } from "@canonical/router-core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
 * Unmounting while blocked disposes the blocker and discards the pending
 * navigation (it is not resumed).
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
  const isActiveRef = useRef(isActive);
  const [handle, setHandle] = useState<RouterBlockerHandle | null>(null);

  isActiveRef.current = isActive;

  useEffect(() => {
    const nextHandle = router.block(() => isActiveRef.current);

    setHandle(nextHandle);

    return () => {
      nextHandle.dispose();
    };
  }, [router]);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      handle ? handle.subscribe(onStoreChange) : () => {},
    [handle],
  );

  const getSnapshot = useCallback(() => handle?.state ?? "idle", [handle]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    state,
    proceed() {
      handle?.proceed();
    },
    cancel() {
      handle?.cancel();
    },
  };
}
