import { useCallback, useEffect, useRef, useState } from "react";
import type { UseDelayedToggleProps, UseDelayedToggleResult } from "./types.js";

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
