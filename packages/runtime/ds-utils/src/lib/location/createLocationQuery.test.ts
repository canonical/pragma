import type { LocationAdapter } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import createLocationQuery from "./createLocationQuery.js";

/** A `LocationAdapter` over an in-memory history stack, with Back and Forward. */
type FakeLocationAdapter = LocationAdapter & {
  readonly back: () => void;
  readonly forward: () => void;
};

/**
 * Create a `LocationAdapter` that keeps its history in memory. It notifies
 * subscribers synchronously, in subscription order, on every navigation, Back
 * and Forward. Like router-core's adapters, it passes the location to each
 * listener. A throwing listener stops the remaining listeners, and the
 * exception propagates to the caller.
 */
const createFakeLocationAdapter = (
  initial: string | URL,
): FakeLocationAdapter => {
  const entries: (string | URL)[] = [initial];
  let index = 0;
  const listeners = new Set<(location: string | URL) => void>();

  const notifyListeners = (): void => {
    for (const listener of [...listeners]) {
      listener(entries[index] as string | URL);
    }
  };

  return {
    getLocation: () => entries[index] as string | URL,
    navigate(url, options) {
      if (options?.replace) {
        entries[index] = url;
      } else {
        entries.splice(index + 1, entries.length, url);
        index += 1;
      }
      notifyListeners();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    back() {
      if (index > 0) {
        index -= 1;
        notifyListeners();
      }
    },
    forward() {
      if (index < entries.length - 1) {
        index += 1;
        notifyListeners();
      }
    },
  };
};

const setup = (initial: string | URL = "/machines") => {
  const adapter = createFakeLocationAdapter(initial);
  const query = createLocationQuery(adapter);
  return { adapter, query };
};

describe("createLocationQuery", () => {
  describe("read", () => {
    it("returns a fresh URLSearchParams on every call", () => {
      const { query } = setup("/machines?status=failed");
      const first = query.read();
      first.set("status", "cancelled");
      expect(query.read()).not.toBe(first);
      expect(query.read().get("status")).toBe("failed");
    });

    it("resolves a URL object", () => {
      const { query } = setup(
        new URL("/machines?status=failed", "http://localhost"),
      );
      expect(query.read().get("status")).toBe("failed");
    });

    it("resolves an absolute URL string", () => {
      const { query } = setup("http://localhost/machines?status=failed");
      expect(query.read().get("status")).toBe("failed");
    });

    it("resolves a root-relative href", () => {
      const { query } = setup("/machines?status=failed");
      expect(query.read().get("status")).toBe("failed");
    });
  });

  describe("write", () => {
    it("preserves repeated values through write and read", () => {
      const { query } = setup();
      const next = new URLSearchParams();
      next.append("status", "failed");
      next.append("status", "cancelled");
      next.append("sort", "updated__desc");
      query.write(next);
      expect(query.read().getAll("status")).toEqual(["failed", "cancelled"]);
    });

    it("preserves repeated values when one parameter changes", () => {
      const { query } = setup();
      query.write(new URLSearchParams("status=failed&status=cancelled"));
      const paged = query.read();
      paged.set("page", "2");
      query.write(paged);
      expect(query.read().getAll("status")).toEqual(["failed", "cancelled"]);
      expect(query.read().get("page")).toBe("2");
    });

    it("preserves repeated values when another parameter repeats", () => {
      const { query } = setup();
      query.write(new URLSearchParams("status=failed&status=cancelled"));
      const sorted = query.read();
      sorted.append("sort", "status__asc");
      sorted.append("sort", "updated__desc");
      query.write(sorted);
      expect(query.read().getAll("status")).toEqual(["failed", "cancelled"]);
      expect(query.read().getAll("sort")).toEqual([
        "status__asc",
        "updated__desc",
      ]);
    });

    it("keeps the path and the hash and replaces only the query", () => {
      const { adapter, query } = setup("/machines?page=3#table");
      query.write(new URLSearchParams("status=failed"));
      expect(adapter.getLocation()).toBe("/machines?status=failed#table");
    });

    it("drops the origin of an absolute URL string", () => {
      const { adapter, query } = setup(
        "http://localhost/machines?page=3#table",
      );
      query.write(new URLSearchParams("status=failed"));
      expect(adapter.getLocation()).toBe("/machines?status=failed#table");
    });

    it("drops the origin of a URL object", () => {
      const { adapter, query } = setup(
        new URL("/machines?page=3#table", "https://example.com"),
      );
      query.write(new URLSearchParams("status=failed"));
      expect(adapter.getLocation()).toBe("/machines?status=failed#table");
    });

    it("writes the parameters in the order given", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("sort=b&status=a&q=a+b%26c"));
      expect(adapter.getLocation()).toBe("/machines?sort=b&status=a&q=a+b%26c");
      expect([...query.read()]).toEqual([
        ["sort", "b"],
        ["status", "a"],
        ["q", "a b&c"],
      ]);
    });

    it("writes an empty query without a question mark", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("status=failed"));
      query.write(new URLSearchParams());
      expect(query.read().toString()).toBe("");
      expect(adapter.getLocation()).toBe("/machines");
    });

    it("replaces the current entry when no history behavior is given", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("status=failed"));
      query.write(new URLSearchParams("status=cancelled"));
      query.write(new URLSearchParams("status=deployed"));
      adapter.back();
      // All three writes replaced the first entry, so Back has nowhere to go.
      expect(query.read().getAll("status")).toEqual(["deployed"]);
    });

    it("replaces the current entry when the history behavior is replace", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("status=failed"), { history: "push" });
      query.write(new URLSearchParams("status=cancelled"), {
        history: "replace",
      });
      adapter.back();
      expect(query.read().getAll("status")).toEqual([]);
      adapter.forward();
      expect(query.read().getAll("status")).toEqual(["cancelled"]);
    });

    it("appends an entry when the history behavior is push", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("status=failed"));
      query.write(new URLSearchParams("status=cancelled"), {
        history: "push",
      });
      adapter.back();
      expect(query.read().getAll("status")).toEqual(["failed"]);
      adapter.forward();
      expect(query.read().getAll("status")).toEqual(["cancelled"]);
    });

    it("preserves repeated values through Back and Forward", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("status=failed&status=cancelled"), {
        history: "push",
      });
      query.write(new URLSearchParams("status=failed"), { history: "push" });
      adapter.back();
      expect(query.read().getAll("status")).toEqual(["failed", "cancelled"]);
      adapter.forward();
      expect(query.read().getAll("status")).toEqual(["failed"]);
    });
  });

  describe("subscribe", () => {
    it("notifies the listener once per write", () => {
      const { query } = setup();
      let notifications = 0;
      query.subscribe(() => {
        notifications += 1;
      });
      query.write(new URLSearchParams("status=failed"));
      expect(notifications).toBe(1);
    });

    it("stops notifying once unsubscribed", () => {
      const { query } = setup();
      let notifications = 0;
      const unsubscribe = query.subscribe(() => {
        notifications += 1;
      });
      unsubscribe();
      query.write(new URLSearchParams("status=failed"));
      expect(notifications).toBe(0);
    });

    it("notifies the listener without arguments for Back, Forward and outside navigations", () => {
      const { adapter, query } = setup();
      query.write(new URLSearchParams("status=failed"), { history: "push" });
      const calls: unknown[][] = [];
      const seen: string[] = [];
      query.subscribe((...args: unknown[]) => {
        calls.push(args);
        seen.push(query.read().toString());
      });
      adapter.back();
      adapter.forward();
      adapter.navigate("/x?a=1");
      expect(calls).toEqual([[], [], []]);
      expect(seen).toEqual(["", "status=failed", "a=1"]);
    });

    it("stops at a throwing listener, so later listeners miss the change", () => {
      const { query } = setup();
      let notifications = 0;
      query.subscribe(() => {
        throw new Error("listener exploded");
      });
      query.subscribe(() => {
        notifications += 1;
      });
      expect(() => query.write(new URLSearchParams("status=failed"))).toThrow(
        "listener exploded",
      );
      expect(notifications).toBe(0);
    });

    it("propagates a throwing listener to the writer", () => {
      const { query } = setup();
      query.subscribe(() => {
        throw new Error("listener exploded");
      });
      expect(() => query.write(new URLSearchParams("status=failed"))).toThrow(
        "listener exploded",
      );
      expect(query.read().get("status")).toBe("failed");
    });
  });
});
