import { useSyncExternalStore } from "react";
import type { StateRecord } from "./types.js";

/**
 * Observe one core record's state and re-render only when it publishes.
 *
 * The companion to `useDataViewsValue` for the records that expose a `state`
 * getter and a `subscribe` rather than a channel. Deliberately absent from
 * the hooks barrel: it exists so the table has one answer to that shape
 * instead of an inlined `useSyncExternalStore` triple per call site.
 */
export default function useDataViewsState<T>(record: StateRecord<T>): T {
  const read = (): T => record.state;
  return useSyncExternalStore(record.subscribe, read, read);
}
