import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { useCallback, useSyncExternalStore } from "react";
import type { UseDestinationProps, UseDestinationResult } from "./types.js";

/**
 * The spelling of a destination a control leads to — a page, the query less
 * the clause a form's own controls submit — as the provider's location
 * would carry it, following the applied state and the location's other
 * parameters. The snapshot is the spelled text, so a publication that
 * leaves the destination as it was re-renders nothing. Null without a
 * location: there is nowhere for a destination to lead. `destinationOf` is
 * compared by identity, so a caller keeps one at module scope.
 */
export default function useDestination({
  provider,
  destinationOf,
}: UseDestinationProps): UseDestinationResult {
  const { spellQuery, location } = readProviderHost(provider);
  const { state } = provider;
  // The destination moves with the query, and with the location's other
  // parameters, which can move without the query — so both are watched.
  const subscribe = useCallback(
    (listener: () => void) => {
      const stopState = state.subscribe(listener);
      const stopLocation = location?.subscribe(listener);
      return () => {
        stopState();
        stopLocation?.();
      };
    },
    [state, location],
  );
  const spell = useCallback(
    (): string | null =>
      spellQuery(destinationOf(state.get()))?.toString() ?? null,
    [spellQuery, state, destinationOf],
  );
  return useSyncExternalStore(subscribe, spell, spell);
}
