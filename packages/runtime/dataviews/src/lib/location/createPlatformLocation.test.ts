import {
  createMemoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { describe, expect, it } from "vitest";
import createPlatformLocation from "./createPlatformLocation.js";

/**
 * The duplicate-preserving transport fixture: repeated query values must
 * survive navigation, paging, sorting and back/forward through the real
 * router. The router's scalar helpers are proven lossy where they are.
 */

const routes = {
  machines: route({
    url: "/machines",
    content: () => "Machines",
  }),
} as const;

const harness = () => {
  const adapter = createMemoryAdapter();
  // Land on the route before the router's initial load so the fixture's
  // writes run against the matched /machines route, not the router's base.
  adapter.navigate("/machines");
  const router = createRouter(routes, { adapter });
  const location = createPlatformLocation(adapter);
  return { adapter, router, location };
};

/** Await the router's asynchronous load pipeline observing a condition. */
const until = async (check: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("the router never reached the expected state");
};

describe("URL transport over the platform adapter", () => {
  it("runs against the matched /machines route", async () => {
    const { router } = harness();
    await until(() => router.getState().match?.kind === "route");
    expect(router.getState().match?.kind).toBe("route");
    expect(router.getState().location.pathname).toBe("/machines");
  });

  it("preserves repeated query values through write and read", () => {
    const { location } = harness();
    const next = new URLSearchParams();
    next.append("status", "failed");
    next.append("status", "cancelled");
    next.append("sort", "updated__desc");
    location.write(next);
    expect(location.read().getAll("status")).toEqual(["failed", "cancelled"]);
  });

  it("preserves repeated values when paging", () => {
    const { location } = harness();
    const base = new URLSearchParams("status=failed&status=cancelled");
    location.write(base);
    const paged = location.read();
    paged.set("page", "2");
    location.write(paged);
    expect(location.read().getAll("status")).toEqual(["failed", "cancelled"]);
    expect(location.read().get("page")).toBe("2");
  });

  it("preserves repeated values when sorting", () => {
    const { location } = harness();
    location.write(new URLSearchParams("status=failed&status=cancelled"));
    const sorted = location.read();
    sorted.append("sort", "status__asc");
    sorted.append("sort", "updated__desc");
    location.write(sorted);
    expect(location.read().getAll("status")).toEqual(["failed", "cancelled"]);
    expect(location.read().getAll("sort")).toEqual([
      "status__asc",
      "updated__desc",
    ]);
  });

  it("lets the router see adapter-driven writes through its own state", async () => {
    const { router, location } = harness();
    location.write(new URLSearchParams("status=failed&status=cancelled"));
    await until(
      () => router.getState().location.searchParams.getAll("status").length > 0,
    );
    expect(router.getState().location.searchParams.getAll("status")).toEqual([
      "failed",
      "cancelled",
    ]);
  });

  it("preserves repeated values through back and forward", () => {
    const { adapter, location } = harness();
    location.write(new URLSearchParams("status=failed&status=cancelled"), {
      history: "push",
    });
    location.write(new URLSearchParams("status=failed"), {
      history: "push",
    });
    adapter.back();
    expect(location.read().getAll("status")).toEqual(["failed", "cancelled"]);
    adapter.forward();
    expect(location.read().getAll("status")).toEqual(["failed"]);
  });

  it("honours the history option on writes", () => {
    const { adapter, location } = harness();
    location.write(new URLSearchParams("status=failed"));
    location.write(new URLSearchParams("status=cancelled"), {
      history: "push",
    });
    adapter.back();
    expect(location.read().getAll("status")).toEqual(["failed"]);
    adapter.forward();
    expect(location.read().getAll("status")).toEqual(["cancelled"]);
  });

  it("replaces by default so continuous input does not flood history", () => {
    const { adapter, location } = harness();
    location.write(new URLSearchParams("status=failed"));
    location.write(new URLSearchParams("status=cancelled"));
    location.write(new URLSearchParams("status=deployed"));
    adapter.back();
    // All three writes replaced: back returns to the entry before them.
    expect(location.read().getAll("status")).toEqual([]);
  });

  it("writes an empty query as a clean href", () => {
    const { adapter, location } = harness();
    location.write(new URLSearchParams("status=failed"));
    location.write(new URLSearchParams());
    expect(location.read().toString()).toBe("");
    expect(adapter.getLocation().search).toBe("");
  });

  it("propagates a throwing listener to the writer", () => {
    const { location } = harness();
    location.subscribe(() => {
      throw new Error("listener exploded");
    });
    expect(() => location.write(new URLSearchParams("status=failed"))).toThrow(
      "listener exploded",
    );
    expect(location.read().get("status")).toBe("failed");
  });

  it("preserves the host's hash across writes", () => {
    const { adapter, location } = harness();
    adapter.navigate("/machines#table");
    location.write(new URLSearchParams("status=failed"));
    expect(adapter.getLocation().hash).toBe("#table");
    expect(adapter.getLocation().pathname).toBe("/machines");
  });

  it("notifies subscribers on adapter-driven writes", () => {
    const { location } = harness();
    let notifications = 0;
    location.subscribe(() => {
      notifications += 1;
    });
    location.write(new URLSearchParams("status=failed"));
    expect(notifications).toBe(1);
  });
});

describe("createPlatformLocation input normalization", () => {
  const platformOf = (location: string | URL) => {
    let current = location;
    const listeners = new Set<(next: string | URL) => void>();
    const platform = {
      getLocation: () => current,
      navigate: (url: string) => {
        current = url;
        for (const listener of [...listeners]) {
          listener(url);
        }
      },
      subscribe: (listener: (next: string | URL) => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    return { location: createPlatformLocation(platform) };
  };

  it("resolves URL instances", () => {
    const { location } = platformOf(
      new URL("/machines?status=failed", "http://localhost"),
    );
    expect(location.read().get("status")).toBe("failed");
  });

  it("resolves absolute URL strings", () => {
    const { location } = platformOf("http://localhost/machines?status=failed");
    expect(location.read().get("status")).toBe("failed");
  });

  it("resolves relative hrefs against the local base", () => {
    const { location } = platformOf("/machines?status=failed");
    expect(location.read().get("status")).toBe("failed");
  });
});

describe("the router's scalar search helpers", () => {
  it("collapse repeated values on read — the documented lossy path", async () => {
    const { router, location } = harness();
    location.write(new URLSearchParams("status=failed&status=cancelled"));
    await until(
      () => router.getState().location.searchParams.getAll("status").length > 0,
    );
    // The typed search machinery reads each key once.
    const typed = router.getState().location.searchParams.get("status");
    expect(typed).toBe("failed");
  });
  it("collapse repeated values through setSearchParams — the documented lossy write", async () => {
    const { router, location } = harness();
    location.write(new URLSearchParams("status=failed&status=cancelled"));
    // The adapter's own state is synchronous; the router's store settles
    // through its async load pipeline.
    await until(
      () => router.getState().location.searchParams.getAll("status").length > 0,
    );
    router.setSearchParams({ page: "2" });
    // The adapter commits synchronously; the collapsed write is immediate.
    expect(location.read().getAll("status")).toEqual(["cancelled"]);
    expect(location.read().get("page")).toBe("2");
  });
});
