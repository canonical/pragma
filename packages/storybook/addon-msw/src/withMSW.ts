import { type SetupWorker, setupWorker } from "msw/browser";
import {
  useEffect,
  useGlobals,
  useParameter,
  useRef,
} from "storybook/internal/preview-api";
import type {
  LoaderFunction,
  Renderer,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import { KEY, PARAM_KEY } from "./constants.js";
import type { MswParameter } from "./types.js";

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

/**
 * Whether MSW should serve this story. The toolbar stores the global as a
 * boolean, and only an explicit `false` turns it off; a story opts out with
 * `parameters.msw.disable`.
 */
const isActive = (
  globalValue: unknown,
  parameter: MswParameter | undefined,
): boolean => globalValue !== false && !(parameter?.disable ?? false);

/**
 * Install the story's handlers on a started worker, or clear them when MSW is
 * off for the story. A worker that failed to start leaves the story to run
 * against the network.
 */
const applyHandlers = async (
  active: boolean,
  handlers: MswParameter["handlers"],
): Promise<void> => {
  if (!active) {
    worker?.resetHandlers();
    return;
  }
  const activeWorker = await initializeWorker();
  if (!activeWorker) return;
  activeWorker.resetHandlers();
  if (handlers && handlers.length > 0) {
    activeWorker.use(...handlers);
  }
};

/**
 * Starts the worker and installs the story's handlers before the story
 * renders. Storybook awaits loaders before it renders a story and before its
 * play function runs, so the story's first render already has its mocks and a
 * play function never waits on MSW.
 */
export const mswLoader: LoaderFunction<Renderer> = async ({
  globals,
  parameters,
}) => {
  const parameter = parameters[PARAM_KEY] as MswParameter | undefined;
  await applyHandlers(isActive(globals[KEY], parameter), parameter?.handlers);
  return {};
};

/**
 * Keeps the handlers in step with the toolbar toggle while a story is shown.
 * It never holds the story back: the loader has already started the worker,
 * and preview-hook effects only run once the story and its play function have
 * finished, so gating the render here would deadlock a play function.
 */
export const withMSW = (StoryFn: StoryFunction<Renderer>) => {
  const [globals] = useGlobals();
  const parameter = useParameter<MswParameter>(PARAM_KEY);
  const active = isActive(globals[KEY], parameter);

  // The handlers array is a new reference on every render even when its
  // contents are the same; read it through a ref so the effect does not re-run.
  const handlersRef = useRef(parameter?.handlers);
  handlersRef.current = parameter?.handlers;

  useEffect(() => {
    void applyHandlers(active, handlersRef.current);
    return () => {
      worker?.resetHandlers();
    };
  }, [active]);

  return StoryFn();
};
