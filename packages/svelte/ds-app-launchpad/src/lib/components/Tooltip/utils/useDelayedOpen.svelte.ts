import { untrack } from "svelte";
import type { ChainingManager } from "./ChainingManager.js";

/**
 * Manage a tooltip's delayed open state, supporting a short-lived "chaining" mode
 * where successive tooltips open without delay.
 *
 * The returned getter reflects whether the tooltip should currently be considered open
 * (after any applied delay). When `getOpen()` becomes false the delayed state resets and
 * briefly enables chaining for the next open.
 *
 * @param getOpen - Reactive getter indicating the raw (immediate) open intent.
 * @param getDelay - Reactive getter providing the delay in milliseconds before showing.
 * @param chainingManager - Shared manager tracking whether chaining is active.
 * @returns A function that returns the (possibly delayed) open boolean.
 */
export function useDelayedOpen(
  getOpen: () => boolean,
  getDelay: () => number,
  chainingManager: ChainingManager,
) {
  let delayedOpen = $state(getOpen());

  $effect(() => {
    if (getOpen()) {
      if (chainingManager.chaining) {
        // If chaining, open immediately without delay
        delayedOpen = true;
        return;
      }

      const delayTimeout = setTimeout(() => {
        delayedOpen = true;
        // Do not rerun if delay changes, apply the new delay only to the next open change
      }, untrack(getDelay));

      return () => clearTimeout(delayTimeout);
    }

    delayedOpen = false;
  });

  let firstRun = true;
  $effect(() => {
    // Each time the tooltip closes, enable chaining for a short period
    // Skip first run. Be sure to read `delayedOpen` first to ensure the effect runs again when it changes
    if (!delayedOpen && !firstRun) {
      chainingManager.chaining = true;
    }
    firstRun = false;
  });

  return () => delayedOpen;
}
