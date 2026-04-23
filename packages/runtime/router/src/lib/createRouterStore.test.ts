import { describe, expect, it, vi } from "vitest";
import createRouter from "./createRouter.js";
import createRouterStore from "./createRouterStore.js";
import route from "./route.js";

describe("createRouterStore", () => {
  it("initializes state from the provided initial URL", () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
      user: route({
        url: "/users/:userId",
        content: ({ params }) => params.userId,
      }),
    });

    const store = createRouterStore(router.match, "/users/42");

    expect(store.getSnapshot()).toMatchObject({
      pathname: "/users/42",
      href: "/users/42",
      status: 200,
      navigationState: "idle",
    });
    expect(store.getState().match).toMatchObject({
      kind: "route",
      name: "user",
      params: { userId: "42" },
    });
  });

  it("notifies search subscribers only for the requested key", () => {
    const store = createRouterStore(() => null);
    const pageListener =
      vi.fn<(value: string | null, previousValue: string | null) => void>();
    const sortListener =
      vi.fn<(value: string | null, previousValue: string | null) => void>();

    store.subscribeToSearchParam("page", pageListener);
    store.subscribeToSearchParam("sort", sortListener);

    store.setLocation("/users?page=2&sort=asc");
    store.setLocation("/users?page=3&sort=asc");

    expect(pageListener).toHaveBeenNthCalledWith(1, "2", null);
    expect(pageListener).toHaveBeenNthCalledWith(2, "3", "2");
    expect(sortListener).toHaveBeenCalledTimes(1);
    expect(sortListener).toHaveBeenCalledWith("asc", null);
  });

  it("notifies navigation subscribers only when the state changes", () => {
    const store = createRouterStore(() => null);
    const listener =
      vi.fn<
        (state: "idle" | "loading", previousState: "idle" | "loading") => void
      >();

    store.subscribeToNavigation(listener);
    store.setNavigationState("loading");
    store.setNavigationState("loading");
    store.setNavigationState("idle");

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, "loading", "idle");
    expect(listener).toHaveBeenNthCalledWith(2, "idle", "loading");
  });

  it("notifies state subscribers when location or navigation changes", () => {
    const store = createRouterStore(() => null);
    const listener =
      vi.fn<(snapshot: ReturnType<typeof store.getSnapshot>) => void>();

    store.subscribe(listener);
    store.setLocation("/users?page=1");
    store.setNavigationState("loading");

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        href: "/users?page=1",
        pathname: "/users",
        status: 404,
      }),
    );
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        navigationState: "loading",
      }),
    );
  });

  it("tracks full search param value changes even when the first value stays stable", () => {
    const store = createRouterStore(() => null);
    const listener =
      vi.fn<(value: string | null, previousValue: string | null) => void>();

    store.subscribeToSearchParam("tag", listener);
    store.setLocation("/users?tag=a&tag=b");
    store.setLocation("/users?tag=a&tag=c");

    expect(listener).toHaveBeenNthCalledWith(1, "a", null);
    expect(listener).toHaveBeenNthCalledWith(2, "a", "a");
  });

  it("supports URL inputs, absolute URL strings, and unchanged location no-ops", () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
      legacy: route({
        url: "/legacy",
        redirect: "/modern",
        status: 301,
      }),
    });
    const store = createRouterStore(
      router.match,
      new URL("https://example.com/docs#intro"),
    );
    const listener = vi.fn();

    store.subscribe(listener);

    store.setLocation("https://example.com/docs#intro");
    expect(listener).not.toHaveBeenCalled();

    store.setLocation(new URL("https://example.com/legacy#top"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      hash: "#top",
      href: "/legacy#top",
      pathname: "/legacy",
      status: 301,
    });
  });

  it("defaults commit status from the provided match or 404 when unmatched", () => {
    const router = createRouter({
      legacy: route({
        url: "/legacy",
        redirect: "/modern",
        status: 308,
      }),
    });
    const store = createRouterStore(router.match);

    store.commit("/legacy", router.match("/legacy"));
    expect(store.getSnapshot().status).toBe(308);

    store.commit("/missing", null);
    expect(store.getSnapshot().status).toBe(404);
  });
});
