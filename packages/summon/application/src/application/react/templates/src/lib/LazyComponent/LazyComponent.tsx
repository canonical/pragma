import { type ReactElement, use } from "react";

/**
 * Demonstrates streaming SSR with Suspense.
 *
 * The component reads a promise with React 19's `use()`, which suspends
 * rendering until the promise resolves. When rendered inside a `<Suspense>`
 * boundary on a streaming server (`renderToPipeableStream` /
 * `renderToReadableStream`), the server flushes the surrounding shell
 * immediately and streams this content in once the data is ready — so the
 * fallback is shown first, then replaced without a full client round-trip.
 *
 * Here the "fetch" is synthetic: a promise that resolves after a short delay.
 * Replace `createDelayedData` with a real data source in your own routes.
 */

/** Synthetic data source — resolves after `delayMs` to simulate a slow fetch. */
function createDelayedData(delayMs = 1000): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("Streamed in after a delay"), delayMs);
  });
}

// Created once at module load so re-renders reuse the same promise rather
// than restarting the "fetch" (and re-suspending) on every render.
const dataPromise = createDelayedData();

export default function LazyComponent(): ReactElement {
  const message = use(dataPromise);

  return <p>{message}</p>;
}
