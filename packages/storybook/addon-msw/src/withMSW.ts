import { type SetupWorker, setupWorker } from "msw/browser";
import React from "react";
import {
  useEffect,
  useGlobals,
  useParameter,
  useRef,
  useState,
} from "storybook/internal/preview-api";
import type {
  Renderer,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import { KEY, PARAM_KEY } from "./constants.js";
import type { MswGlobals, MswParameter } from "./types.js";

// Singleton worker instance
let worker: SetupWorker | null = null;
let workerPromise: Promise<SetupWorker | null> | null = null;

const initializeWorker = async (): Promise<SetupWorker | null> => {
  if (workerPromise) {
    return workerPromise;
  }

  workerPromise = (async () => {
    try {
      worker = setupWorker();
      await worker.start({
        serviceWorker: { url: "/mockServiceWorker.js" },
        onUnhandledRequest: "bypass",
      });
      return worker;
    } catch (error) {
      console.warn("[MSW Addon] Failed to initialize worker:", error);
      worker = null;
      workerPromise = null;
      return null;
    }
  })();

  return workerPromise;
};

export const withMSW = (StoryFn: StoryFunction<Renderer>) => {
  const [globals] = useGlobals();
  const mswGlobals = globals[KEY] as MswGlobals | undefined;
  const mswParameter = useParameter<MswParameter>(PARAM_KEY);

  const isEnabled = mswGlobals?.enabled ?? true;
  const isDisabled = mswParameter?.disable ?? false;
  const handlers = mswParameter?.handlers;

  // Effects of Storybook preview hooks only run once the story has rendered,
  // which includes its play function. When MSW is off there is nothing to wait
  // for, so render the story straight away rather than a placeholder the play
  // function would see instead of the story.
  const [isWorkerReady, setIsWorkerReady] = useState(!isEnabled || isDisabled);

  // Store handlers in a ref to avoid re-running effect on every render
  // The handlers array reference changes on each render even if contents are same
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isEnabled || isDisabled) {
      setIsWorkerReady(true);
      return;
    }

    let cancelled = false;

    const setupHandlers = async () => {
      const activeWorker = await initializeWorker();
      if (cancelled) return;

      // If worker failed to initialize, just mark as ready and continue without MSW
      if (!activeWorker) {
        setIsWorkerReady(true);
        return;
      }

      const currentHandlers = handlersRef.current;
      if (currentHandlers && currentHandlers.length > 0) {
        activeWorker.resetHandlers();
        activeWorker.use(...currentHandlers);
      } else {
        activeWorker.resetHandlers();
      }
      setIsWorkerReady(true);
    };

    setupHandlers();

    return () => {
      cancelled = true;
      if (worker) {
        worker.resetHandlers();
      }
    };
  }, [isEnabled, isDisabled]);

  if (!isWorkerReady) {
    return React.createElement("div", {}, "Loading MSW...");
  }

  return StoryFn();
};
