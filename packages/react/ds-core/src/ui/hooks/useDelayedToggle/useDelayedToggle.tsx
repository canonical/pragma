import { useCallback, useEffect, useRef, useState } from "react";
import type { UseDelayedToggleProps } from "./types.js";

const useDelayedToggle = ({
  activateDelay,
  deactivateDelay,
}: UseDelayedToggleProps) => {
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

  const activate = useCallback(() => {
    console.log("activate called");
    replaceTimer(
      setTimeout(() => {
        setFlag(true);
      }, activateDelay),
    );
  }, [activateDelay, replaceTimer]);

  const deactivate = useCallback(() => {
    console.log("deactivate called");
    replaceTimer(
      setTimeout(() => {
        setFlag(false);
      }, deactivateDelay),
    );
  }, [deactivateDelay, replaceTimer]);

  useEffect(() => {
    return () => {
      if (flagTimeout.current) {
        clearTimeout(flagTimeout.current);
      }
    };
  });

  return { flag, activate, deactivate };
};

export default useDelayedToggle;
