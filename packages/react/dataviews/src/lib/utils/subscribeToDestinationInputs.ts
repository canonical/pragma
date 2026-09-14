import type { ProviderHost } from "@canonical/dataviews-core/bindings";

/** The members of a provider's host a destination is spelled from beside the query. */
type DestinationInputs = Pick<ProviderHost, "view" | "location">;

/**
 * Subscribe one listener to what a destination is spelled from beside the
 * query: the saved view open beside it and, when there is one, the location.
 * The release stops both, and a location that refuses the subscription
 * leaves nothing subscribed.
 *
 * @note Impure by design: it registers the listener on the view channel and
 * the location port; the returned release removes both.
 */
export default function subscribeToDestinationInputs(
  inputs: DestinationInputs,
  listener: () => void,
): () => void {
  const stopView = inputs.view.subscribe(listener);
  let stopLocation: (() => void) | undefined;
  try {
    stopLocation = inputs.location?.subscribe(listener);
  } catch (error) {
    // Nothing is left subscribed by a subscription that failed.
    stopView();
    throw error;
  }
  return () => {
    stopView();
    stopLocation?.();
  };
}
