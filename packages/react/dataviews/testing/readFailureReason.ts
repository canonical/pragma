import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Source,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { vi } from "vitest";
import type { Machine } from "../src/storybook/machines/fixtures.js";
import { DELIVERY_WAIT } from "./constants.js";

/**
 * Run one request through a story source and read the reason it fails
 * with, once it has.
 *
 * @note Impure: the source sends a request.
 */
export default async function readFailureReason(
  source: Source<Machine>,
): Promise<string> {
  const deliveries: SourceDelivery<Machine>[] = [];
  const stop = source.execute(
    { requestId: "failure", slice: EMPTY_SLICE, window: DEFAULT_WINDOW },
    (delivery) => {
      deliveries.push(delivery);
    },
  );
  return (
    vi
      .waitFor(() => {
        const last = deliveries.at(-1);
        if (last?.status !== "failed") {
          throw new Error("the request has not failed yet");
        }
        return last.failure.reason;
      }, DELIVERY_WAIT)
      // Stopped however the wait ends, so no request outlives its test.
      .finally(stop)
  );
}
