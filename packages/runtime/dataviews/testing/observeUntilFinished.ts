import { onTestFinished } from "vitest";

/**
 * Observe a record as a mounted control does, releasing when the test ends
 * — before any store the test opened earlier is disposed, so a write still
 * gathering reaches a live store. The release is returned for a test that
 * releases sooner; releasing twice is releasing once.
 */
export default function observeUntilFinished(observable: {
  readonly observe: () => () => void;
}): () => void {
  const release = observable.observe();
  onTestFinished(release);
  return release;
}
