import { useSyncExternalStore } from "react";
import type { UseIsHydratedResult } from "./types.js";

/** Nothing moves once hydrated, so nothing is subscribed to. */
const subscribeToNothing = (): (() => void) => () => {};

const readHydrated = (): boolean => true;

const readOnServer = (): boolean => false;

/**
 * Whether this render runs in a browser whose scripts have taken over: false
 * on the server and in the hydrating render that must match it, true in every
 * render after and in a client render with nothing to hydrate.
 *
 * What a control reads before offering behaviour only a script provides, so
 * the markup a server sends — and a browser without scripting keeps — never
 * advertises a button that does nothing.
 */
export default function useIsHydrated(): UseIsHydratedResult {
  return useSyncExternalStore(subscribeToNothing, readHydrated, readOnServer);
}
