import { describe, expect, it, vi } from "vitest";
import createMemoryAdapter from "./createMemoryAdapter.js";
import type { MemoryHistoryDelegate } from "./types.js";

/** A minimal host that owns location state behind a delegate. */
function createHostStore(initialUrl: string) {
  const listeners = new Set<(location: string | URL) => void>();
  let current = new URL(initialUrl, "http://localhost");

  return {
    set(url: string): void {
      current = new URL(url, "http://localhost");

      for (const listener of listeners) {
        listener(new URL(current.href));
      }
    },
    read(): URL {
      return current;
    },
    subscribe(listener: (location: string | URL) => void): () => void {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

describe("createMemoryAdapter", () => {
  it("tracks push and replace navigations in memory", () => {
    const adapter = createMemoryAdapter(new URL("https://example.com/start"));
    const listener = vi.fn<(location: string | URL) => void>();
    const unsubscribe = adapter.subscribe(listener);

    adapter.navigate("https://example.com/first");
    adapter.navigate(new URL("https://example.com/second?tab=details"), {
      replace: true,
    });
    unsubscribe();
    adapter.navigate("/ignored");

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/ignored",
      search: "",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("supports back and forward navigation without leaving the in-memory stack", () => {
    const adapter = createMemoryAdapter("/start");
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    adapter.navigate("/first");
    adapter.navigate("/second");
    adapter.back();
    adapter.back();
    adapter.back();
    adapter.forward();
    adapter.forward();
    adapter.forward();

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/second",
    });
    expect(listener).toHaveBeenCalledTimes(6);
  });

  it("reports the correct location after each navigation step", () => {
    const adapter = createMemoryAdapter("/start");

    adapter.navigate("/first");

    expect(adapter.getLocation().pathname).toBe("/first");

    adapter.navigate("/second?tab=1");

    expect(adapter.getLocation().pathname).toBe("/second");
    expect(adapter.getLocation().search).toBe("?tab=1");

    adapter.back();

    expect(adapter.getLocation().pathname).toBe("/first");
    expect(adapter.getLocation().search).toBe("");

    adapter.forward();

    expect(adapter.getLocation().pathname).toBe("/second");
    expect(adapter.getLocation().search).toBe("?tab=1");
  });
});

describe("createMemoryAdapter with a history delegate", () => {
  it("reads the current location through the delegate, not a local copy", () => {
    const host = createHostStore("/dashboard");
    const adapter = createMemoryAdapter("/ignored-initial-url", {
      history: {
        getLocation: () => host.read(),
        onNavigate: () => {},
        subscribe: host.subscribe,
      },
    });

    expect(adapter.getLocation().pathname).toBe("/dashboard");

    host.set("/settings");

    expect(adapter.getLocation().pathname).toBe("/settings");
  });

  it("forwards navigate to onNavigate with options intact and mutates nothing locally", () => {
    const host = createHostStore("/home");
    const onNavigate = vi.fn<MemoryHistoryDelegate["onNavigate"]>();
    const adapter = createMemoryAdapter("/", {
      history: {
        getLocation: () => host.read(),
        onNavigate,
        subscribe: host.subscribe,
      },
    });

    adapter.navigate("/profile", { replace: true, state: { from: "menu" } });

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("/profile", {
      replace: true,
      state: { from: "menu" },
    });
    // The adapter kept no entry of its own: location still reads what the host
    // holds, because a delegated adapter owns no entries array or index.
    expect(adapter.getLocation().pathname).toBe("/home");
  });

  it("propagates host-driven location changes through the adapter's own subscribe surface", () => {
    const host = createHostStore("/start");
    const adapter = createMemoryAdapter("/", {
      history: {
        getLocation: () => host.read(),
        onNavigate: () => {},
        subscribe: host.subscribe,
      },
    });
    const listener = vi.fn<(location: string | URL) => void>();
    const unsubscribe = adapter.subscribe(listener);

    host.set("/next");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ pathname: "/next" });

    unsubscribe();
    host.set("/after-unsubscribe");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(adapter.getLocation().pathname).toBe("/after-unsubscribe");
  });

  it("forwards back and forward to the optional delegate hooks", () => {
    const host = createHostStore("/a");
    const onBack = vi.fn<() => void>();
    const onForward = vi.fn<() => void>();
    const adapter = createMemoryAdapter("/", {
      history: {
        getLocation: () => host.read(),
        onNavigate: () => {},
        subscribe: host.subscribe,
        onBack,
        onForward,
      },
    });

    adapter.back();
    adapter.forward();

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it("treats back and forward as no-ops when the delegate omits the history hooks", () => {
    const host = createHostStore("/only");
    const adapter = createMemoryAdapter("/", {
      history: {
        getLocation: () => host.read(),
        onNavigate: () => {},
        subscribe: host.subscribe,
      },
    });

    expect(() => {
      adapter.back();
      adapter.forward();
    }).not.toThrow();
    expect(adapter.getLocation().pathname).toBe("/only");
  });
});
