/**
 * Unit tests for the lazy store's long-lived-server behaviour (PR9 Stream 3):
 *
 * - C1: a REJECTED boot is not memoized, so a retry after STORE_UNAVAILABLE can
 *   succeed once `sources update` has built the pack (the failure mode that
 *   strands an MCP session until a full server restart).
 * - `invalidate()`: drops the memoized session so the next `get()` re-boots, and
 *   fires the `onInvalidate` hook the runtime wires to also clear its config memo.
 *
 * The loader is a hard-wired `await import("./loadSession.js")`, so we mock that
 * module to drive success/failure across calls without booting oxigraph.
 */

import { describe, expect, it, vi } from "vitest";
import type { ConfigLayers } from "../config/types.js";
import { PragmaError } from "../error/PragmaError.js";
import { createLazyStore, type LazyStoreContext } from "./store.js";
import type { StoreSession } from "./types.js";

// Hoisted so the (hoisted) `vi.mock` factory below can close over it.
const loadStoreSession = vi.hoisted(() => vi.fn());
vi.mock("./loadSession.js", () => ({ loadStoreSession }));

/** A stand-in session — the store never inspects it, so identity is enough. */
const fakeSession = { marker: "session" } as unknown as StoreSession;

/** A minimal, correctly-typed ctx (the mocked loader ignores it). */
function makeCtx(onInvalidate?: () => void): LazyStoreContext {
  return {
    cwd: "/fixture",
    loadConfig: async () => ({}) as unknown as ConfigLayers,
    ...(onInvalidate ? { onInvalidate } : {}),
  };
}

describe("createLazyStore — cold-boot recovery (C1)", () => {
  it("does not memoize a rejected boot: a retry after STORE_UNAVAILABLE can succeed", async () => {
    loadStoreSession.mockReset();
    // Cold on the first attempt, then warm (as if `sources update` ran between).
    loadStoreSession
      .mockRejectedValueOnce(PragmaError.storeUnavailable("no pack"))
      .mockResolvedValueOnce(fakeSession);

    const store = createLazyStore(makeCtx());

    await expect(store.get()).rejects.toMatchObject({
      code: "STORE_UNAVAILABLE",
    });
    // The failed boot left the store cold — the rejection was NOT memoized.
    expect(store.booted).toBe(false);

    // The retry re-attempts the loader (not a memoized rejection) and resolves.
    await expect(store.get()).resolves.toBe(fakeSession);
    expect(store.booted).toBe(true);
    expect(loadStoreSession).toHaveBeenCalledTimes(2);
  });
});

describe("createLazyStore — invalidate()", () => {
  it("memoizes a successful boot until invalidated", async () => {
    loadStoreSession.mockReset();
    loadStoreSession.mockResolvedValue(fakeSession);

    const store = createLazyStore(makeCtx());
    await store.get();
    await store.get();

    // A successful session is memoized: the second get() does not re-boot.
    expect(loadStoreSession).toHaveBeenCalledTimes(1);
    expect(store.booted).toBe(true);
  });

  it("drops the memo, re-boots on the next get(), and fires onInvalidate", async () => {
    loadStoreSession.mockReset();
    loadStoreSession.mockResolvedValue(fakeSession);
    const onInvalidate = vi.fn();

    const store = createLazyStore(makeCtx(onInvalidate));
    await store.get();
    expect(store.booted).toBe(true);
    expect(loadStoreSession).toHaveBeenCalledTimes(1);

    store.invalidate();

    // booted resets and the sibling-cache hook fires...
    expect(store.booted).toBe(false);
    expect(onInvalidate).toHaveBeenCalledTimes(1);

    // ...so the next get() re-boots against (potentially new) on-disk state.
    await store.get();
    expect(store.booted).toBe(true);
    expect(loadStoreSession).toHaveBeenCalledTimes(2);
  });
});
