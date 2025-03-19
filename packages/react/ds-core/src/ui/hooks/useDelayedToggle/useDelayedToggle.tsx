import { useCallback, useEffect, useRef, useState } from "react";
import type { UseDelayedToggleProps, UseDelayedToggleResult } from "./types.js";

/**
 * Hook to toggle a flag with a delay.
 * Allows the caller to `activate()` or `deactivate()` some flag
 * @param activateDelay The delay in milliseconds before setting the flag to true.
 * @param deactivateDelay   The delay in milliseconds before setting the flag to false.
 * @param onActivate A callback to be called when the flag is set to true.
 * @param onDeactivate A callback to be called when the flag is set to false.
 * @returns The current state of the flag, functions to activate and deactivate the flag.
 */
const useDelayedToggle = ({
  activateDelay = 150,
  deactivateDelay = 150,
  onActivate,
  onDeactivate,
}: UseDelayedToggleProps): UseDelayedToggleResult => {
  const [flag, setFlag] = useState(false);
  const flagTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const replaceTimer = useCallback(
    (newTimer?: ReturnType<typeof setTimeout>) => {
      if (flagTimeout.current) {
        clearTimeout(flagTimeout.current);
      }
      flagTimeout.current = newTimer;
    },
    [],
  );

  const activate = useCallback(
    (event: Event) => {
      replaceTimer(
        setTimeout(() => {
          setFlag(true);
          if (onActivate) onActivate(event);
        }, activateDelay),
      );
    },
    [activateDelay, replaceTimer, onActivate],
  );

  const deactivate = useCallback(
    (event: Event) => {
      replaceTimer(
        setTimeout(() => {
          setFlag(false);
          if (onDeactivate) onDeactivate(event);
        }, deactivateDelay),
      );
    },
    [deactivateDelay, replaceTimer, onDeactivate],
  );

  return { flag, activate, deactivate };
};

export default useDelayedToggle;
