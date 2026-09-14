import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { useCallback, useSyncExternalStore } from "react";
import { subscribeToDestinationInputs } from "../../../utils/index.js";
import type { UseDestinationProps, UseDestinationResult } from "./types.js";

/**
 * The spelling of a destination a control leads to — a page, the query less the
 * clause a form's own controls submit — as the provider's location would carry
 * it, following the applied state, the open view and the location's other
 * parameters. The value React reads is the spelled text, so a publication that
 * leaves the destination as it was re-renders nothing. Null without a location:
 * there is nowhere for a destination to lead. `destinationOf` is compared by
 * identity, so a caller keeps one at module scope.
 */
export default function useDestination({
  provider,
  destinationOf,
}: UseDestinationProps): UseDestinationResult {
  const { spellQuery, location, view } = readProviderHost(provider);
  const { state } = provider;
  // The destination moves with the query, with the saved view open beside
  // it, and with the location's other parameters — each of which can move
  // without the others — so all three are watched.
  const subscribe = useCallback(
    (listener: () => void) => {
      // The inputs first: a location refusing its subscription then leaves
      // nothing subscribed.
      const stopInputs = subscribeToDestinationInputs(
        { view, location },
        listener,
      );
      const stopState = state.subscribe(listener);
      return () => {
        stopState();
        stopInputs();
      };
    },
    [state, view, location],
  );
  const spell = useCallback(
    (): string | null =>
      spellQuery(destinationOf(state.get()))?.toString() ?? null,
    [spellQuery, state, destinationOf],
  );
  return useSyncExternalStore(subscribe, spell, spell);
}
