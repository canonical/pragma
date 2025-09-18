import { type SetupWorker, setupWorker } from "msw/browser";
// src/withMSW.ts
import React from "react";
import {
  useEffect,
  useGlobals,
  useParameter,
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
let workerPromise: Promise<SetupWorker> | null = null;

const initializeWorker = async (): Promise<SetupWorker> => {
  if (!worker) {
    worker = setupWorker();
    await worker.start({
      serviceWorker: { url: "/mockServiceWorker.js" },
      // TODO remove me before merging this PR, this helps with debugging
      onUnhandledRequest: "error",
    });
    console.log("Worker initialized and started");
    workerPromise = Promise.resolve(worker);
  }
  return workerPromise as Promise<SetupWorker>;
};

export const withMSW = (StoryFn: StoryFunction<Renderer>) => {
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [globals] = useGlobals();
  const mswGlobals = globals[KEY] as MswGlobals | undefined;
  const mswParameter = useParameter<MswParameter>(PARAM_KEY);

  const isEnabled = mswGlobals?.enabled ?? true;
  const isDisabled = mswParameter?.disable ?? false;
  const handlers = mswParameter?.handlers ?? [];

  useEffect(() => {
    console.log("useEffect running", { isEnabled, isDisabled, handlers });
    if (!isEnabled || isDisabled) {
      setIsWorkerReady(true); // Skip MSW setup and render immediately
      return;
    }

    const setupHandlers = async () => {
      console.log("Setting up handlers");
      const activeWorker = await initializeWorker();
      if (activeWorker && handlers.length > 0) {
        activeWorker.resetHandlers();
        activeWorker.use(...handlers);
        console.log("Handlers applied", handlers);
      } else if (activeWorker) {
        activeWorker.resetHandlers();
        console.log("Handlers reset");
      }
      setIsWorkerReady(true); // Signal that setup is complete
    };

    setupHandlers();
    return () => {
      if (worker) {
        worker.resetHandlers();
        console.log("Cleanup: handlers reset");
      }
    };
  }, [isEnabled, isDisabled, handlers]);

  // Delay rendering until the worker is ready
  if (!isWorkerReady) {
    console.log("Waiting for MSW worker...");
    return React.createElement("div", {}, "Loading MSW...");
  }

  return StoryFn();
};
