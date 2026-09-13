import type { ReadonlyChannel } from "@canonical/dataviews-core";
import { useSyncExternalStore } from "react";

/**
 * Observe one provider channel and re-render only when it publishes. The
 * value is the channel's immutable snapshot.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function useDataViewsValue<T>(channel: ReadonlyChannel<T>): T {
  return useSyncExternalStore(channel.subscribe, channel.get, channel.get);
}
