import { useCallback, useEffect, useRef, useState } from "react";
import type { UseDelayedOpenProps } from "./types.js";

const useDelayedOpen = ({ showDelay, hideDelay }: UseDelayedOpenProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const visibilityTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const replaceTimer = useCallback(
    (newTimer?: ReturnType<typeof setTimeout>) => {
      if (visibilityTimeout.current) {
        clearTimeout(visibilityTimeout.current);
      }
      visibilityTimeout.current = newTimer;
    },
    [],
  );

  const open = useCallback(() => {
    console.log("open called");
    replaceTimer(
      setTimeout(() => {
        setIsVisible(true);
      }, showDelay),
    );
  }, [showDelay, replaceTimer]);

  const close = useCallback(() => {
    console.log("close called");
    replaceTimer(
      setTimeout(() => {
        setIsVisible(false);
      }, hideDelay),
    );
  }, [hideDelay, replaceTimer]);

  useEffect(() => {
    return () => {
      if (visibilityTimeout.current) {
        clearTimeout(visibilityTimeout.current);
      }
    };
  });

  return { isVisible, open, close };
};

export default useDelayedOpen;
