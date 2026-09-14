import type { RequestHandler } from "msw";
import type { SetupWorker } from "msw/browser";

/** The preview's one worker, started by the first story that needs it. */
let started: Promise<SetupWorker> | null = null;

/**
 * A Storybook loader answering a story's requests with these handlers,
 * through Mock Service Worker, before the story first renders — so the
 * story mounts once, over a worker already listening, and a play function
 * never acts on a story that is later mounted again.
 *
 * Every story using it replaces the worker's handlers with its own, so none
 * carries into the next. Requests no handler matches — the preview's own
 * modules and assets — pass through to the network untouched.
 *
 * Where there is no service worker, as in vitest's jsdom, it does nothing:
 * a test serves the same handlers through msw/node instead.
 *
 * @note Impure: registers a service worker once per preview, and replaces
 * its handlers for each story.
 */
export default function createMockApiLoader(
  handlers: readonly RequestHandler[],
): () => Promise<void> {
  return async () => {
    if (!("serviceWorker" in globalThis.navigator)) {
      return;
    }
    started ??= import("msw/browser").then(async ({ setupWorker }) => {
      const worker = setupWorker();
      await worker.start({
        // Beside the preview's own page, wherever Storybook is served from.
        serviceWorker: { url: "./mockServiceWorker.js" },
        onUnhandledRequest: "bypass",
        quiet: true,
      });
      return worker;
    });
    const worker = await started;
    worker.resetHandlers(...handlers);
  };
}
