import type { ReadonlyChannel } from "@canonical/dataviews-core";
import { useSyncExternalStore } from "react";

/**
 * Observe one provider channel and re-render only when it publishes. The
 * value is the channel's immutable snapshot.
 */
export default function useDataViewsValue<T>(channel: ReadonlyChannel<T>): T {
  return useSyncExternalStore(channel.subscribe, channel.get, channel.get);
}
