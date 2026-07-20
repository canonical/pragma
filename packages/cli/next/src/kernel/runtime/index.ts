/**
 * Runtime kernel barrel — the per-invocation context, its builder, and the
 * lazy store / query facade the store-backed capabilities reach through.
 */

export { bootRuntime } from "./boot.js";
export { createQueryFacade } from "./facade.js";
export { createLazyStore, type LazyStoreContext } from "./store.js";
export type {
  GlobalFlags,
  LazyStore,
  PragmaRuntime,
  QueryFacade,
  StoreSession,
} from "./types.js";
