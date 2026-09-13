import type { ReadonlyChannel } from "./types.js";

/**
 * The read side of a channel as a separate, frozen object: `get` and
 * `subscribe` and nothing else. What a provider, a handle or a scope hands
 * outward is this view, so the writable channel stays with its publisher
 * at runtime and not only in its type — a consumer holding the view has
 * no `set` to find, cast to or call.
 *
 * Pure: the view closes over the channel's own read functions and holds
 * no state of its own.
 */
export default function protectChannel<T>(
  channel: ReadonlyChannel<T>,
): ReadonlyChannel<T> {
  return Object.freeze({
    get: () => channel.get(),
    subscribe: (listener: () => void) => channel.subscribe(listener),
  });
}
