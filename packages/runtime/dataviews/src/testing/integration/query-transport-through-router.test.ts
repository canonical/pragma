/**
 * Repeated query values survive the real router: the duplicate-preserving
 * transport fixture, run through `@canonical/router-core`'s own router over
 * its memory adapter. The router's scalar search helpers are proven lossy
 * where they are, so the platform location is the path a collection's
 * query takes and never those helpers.
 */

import {
  createMemoryAdapter,
  createRouter,
  type RouteMap,
  route,
} from "@canonical/router-core";
import { describe, expect, it } from "vitest";
import { createPlatformLocation } from "../../lib/location/index.js";

const routes = {
  machines: route({
    url: "/machines",
    content: () => "Machines",
  }),
  // A route with no params is spelled with `params: undefined` by the
  // router, which its own route map type does not admit under exact
  // optional property types; the map is what the router runs on regardless.
} as const satisfies Record<string, unknown>;

const harness = () => {
  const adapter = createMemoryAdapter();
  // Land on the route before the router's initial load so the fixture's
  // writes run against the matched /machines route, not the router's base.
  adapter.navigate("/machines");
  const router = createRouter(routes as unknown as RouteMap, { adapter });
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

describe("query transport through the router", () => {
  it("runs against the matched /machines route", async () => {
    const { router } = harness();
    await until(() => router.getState().match?.kind === "route");
    expect(router.getState().match?.kind).toBe("route");
    expect(router.getState().location.pathname).toBe("/machines");
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
