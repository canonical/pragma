import type { ReadonlyChannel } from "@canonical/dataviews-core";
import { useSyncExternalStore } from "react";
import type { UseDataViewsValueResult } from "./types.js";

/**
 * Observe one provider channel and re-render only when it publishes. The
 * value is the channel's immutable snapshot, or the part of it `select`
 * picks — then a publication that leaves that part the same re-renders
 * nothing. A selector returns a part of the snapshot, never a value it
 * mints: React compares consecutive reads by identity.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function useDataViewsValue<T>(
  channel: ReadonlyChannel<T>,
): UseDataViewsValueResult<T>;
export default function useDataViewsValue<T, TSelected>(
  channel: ReadonlyChannel<T>,
  select: (value: T) => TSelected,
): UseDataViewsValueResult<TSelected>;
export default function useDataViewsValue<T>(
  channel: ReadonlyChannel<T>,
  select: (value: T) => unknown = (value) => value,
): unknown {
  const read = (): unknown => select(channel.get());
  return useSyncExternalStore(channel.subscribe, read, read);
}
