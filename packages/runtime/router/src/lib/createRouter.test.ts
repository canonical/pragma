import { describe, expect, expectTypeOf, it, vi } from "vitest";
import createMemoryAdapter from "./createMemoryAdapter.js";
import createRouter from "./createRouter.js";
import group from "./group.js";
import route from "./route.js";
import StatusResponse from "./StatusResponse.js";
import type { AnyRoute, RouteMiddleware } from "./types.js";
import wrapper from "./wrapper.js";

describe("createRouter", () => {
  it("builds hrefs and navigation intents from typed route names", () => {
    const userSearchSchema = {
      "~standard": {
        output: {} as {
          tab: string;
          ignored?: string;
          filters: Array<string | undefined>;
        },
      },
    };

    const homeRoute = route({
      url: "/",
      content: () => "home",
    });

    const userRoute = route({
      url: "/users/:userId",
      search: userSearchSchema,
      content: ({ params }) => params.userId,
    });

    const router = createRouter({
      home: homeRoute,
      user: userRoute,
    });

    expect(router.getRoute("user")).toBe(userRoute);
    expect(router.buildPath("home")).toBe("/");
    expect(router.buildPath("user", { params: { userId: "42" } })).toBe(
      "/users/42",
    );
    expect(
      router.buildPath("user", {
        params: { userId: "42" },
        search: {
          tab: "activity",
          ignored: undefined,
          filters: ["new", undefined, "saved"],
        },
        hash: "#details",
      }),
    ).toBe("/users/42?tab=activity&filters=new&filters=saved#details");
    expect(
      router.navigate("user", {
        params: { userId: "42" },
        hash: "details",
      }),
    ).toEqual({
      name: "user",
      href: "/users/42#details",
      params: { userId: "42" },
      search: {},
      hash: "details",
    });
  });

  it("defaults params and search when build options are omitted", () => {
    const homeRoute = route({
      url: "/",
      content: () => "home",
    });

    const router = createRouter({
      home: homeRoute,
    });

    expect(router.navigate("home")).toEqual({
      name: "home",
      href: "/",
      params: {},
      search: {},
      hash: undefined,
    });

    expect(router.buildPath("home", { search: {}, hash: "top" })).toBe("/#top");
    router.dispose();
  });

  it("exposes a typed notFound route without adding it to navigable route names", () => {
    const homeRoute = route({
      url: "/",
      content: () => "home",
    });

    const notFoundRoute = route({
      url: "/*",
      content: () => "not-found",
    });

    const router = createRouter(
      {
        home: homeRoute,
      },
      {
        notFound: notFoundRoute,
      },
    );

    expect(router.notFound).toBe(notFoundRoute);
  });

  it("validates wrapper identities against the notFound route", () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const conflictingLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const homeRoute = group(appLayout, [
      route({
        url: "/",
        content: () => "home",
      }),
    ] as const)[0];

    const notFoundRoute = group(conflictingLayout, [
      route({
        url: "/*",
        content: () => "not-found",
      }),
    ] as const)[0];

    expect(() => {
      createRouter(
        {
          home: homeRoute,
        },
        {
          notFound: notFoundRoute,
        },
      );
    }).toThrow(
      "Wrapper id 'app:layout' is attached to multiple wrapper definitions.",
    );
  });

  it("preserves typed params and search shapes", () => {
    const searchSchema = {
      "~standard": {
        output: {} as {
          q: string;
          page: number;
        },
      },
    };

    const homeRoute = route({
      url: "/",
      content: () => "home",
    });

    const userRoute = route({
      url: "/users/:userId",
      content: ({ params }) => params.userId,
    });

    const searchRoute = route({
      url: "/search",
      search: searchSchema,
      content: ({ search }) => `${search.q}:${search.page}`,
    });

    const router = createRouter({
      home: homeRoute,
      user: userRoute,
      search: searchRoute,
    });

    const navigationIntent = router.navigate("search", {
      search: {
        q: "router",
        page: 2,
      },
    });

    expectTypeOf(navigationIntent.params).toEqualTypeOf<
      Record<string, never>
    >();
    expectTypeOf(navigationIntent.search).toEqualTypeOf<{
      q: string;
      page: number;
    }>();

    void (() => {
      // @ts-expect-error user route params are required
      router.buildPath("user");

      // @ts-expect-error wrong param name
      router.navigate("user", { params: { id: "42" } });

      // @ts-expect-error typed search must include q
      router.navigate("search", { search: { page: 2 } });

      // @ts-expect-error notFound is not a named route
      router.navigate("notFound");
    });
  });

  it("matches routes by specificity and validates search params", () => {
    const searchSchema = {
      "~standard": {
        output: {} as { page: number; tag: string },
        validate(value: unknown) {
          const raw = value as { page?: string; tag?: string };

          return {
            page: Number(raw.page ?? "1"),
            tag: raw.tag ?? "",
          };
        },
      },
    };

    const searchRoute = route({
      url: "/users/:userId",
      search: searchSchema,
      content: ({ params }) => params.userId,
    });

    const settingsRoute = route({
      url: "/users/settings",
      content: () => "settings",
    });

    const catchAllRoute = route({
      url: "/users/*",
      content: () => "catch-all",
    });

    const router = createRouter({
      user: searchRoute,
      settings: settingsRoute,
      catchAll: catchAllRoute,
    });

    const settingsMatch = router.match(
      new URL("https://example.com/users/settings"),
    );
    const userMatch = router.match(
      "https://example.com/users/42?page=2&tag=typescript",
    );
    const wildcardMatch = router.match("/users/42/history");

    expect(settingsMatch).toMatchObject({
      kind: "route",
      name: "settings",
      status: 200,
      pathname: "/users/settings",
    });
    expect(userMatch).toMatchObject({
      kind: "route",
      name: "user",
      status: 200,
      pathname: "/users/42",
      params: { userId: "42" },
      search: { page: 2, tag: "typescript" },
    });
    expect(wildcardMatch).toMatchObject({
      kind: "route",
      name: "catchAll",
      status: 200,
      pathname: "/users/42/history",
    });
  });

  it("prefers parameterized routes over wildcards and exact routes over wildcard prefixes", () => {
    const router = createRouter({
      exactDocs: route({
        url: "/docs",
        content: () => "docs",
      }),
      wildcardDocs: route({
        url: "/docs/*",
        content: () => "docs-wildcard",
      }),
      user: route({
        url: "/:userId",
        content: ({ params }) => params.userId,
      }),
      wildcard: route({
        url: "/*",
        content: () => "wildcard",
      }),
    });

    expect(router.match("/docs")).toMatchObject({
      kind: "route",
      name: "exactDocs",
      pathname: "/docs",
    });
    expect(router.match("/adrian")).toMatchObject({
      kind: "route",
      name: "user",
      params: { userId: "adrian" },
    });
  });

  it("keeps declaration order when two routes have equal specificity", () => {
    const router = createRouter({
      first: route({
        url: "/:firstId",
        content: ({ params }) => params.firstId,
      }),
      second: route({
        url: "/:secondId",
        content: ({ params }) => params.secondId,
      }),
    });

    expect(router.match("/shared")).toMatchObject({
      kind: "route",
      name: "first",
      params: { firstId: "shared" },
    });
  });

  it("treats incomplete parameterized paths as unmatched", () => {
    const router = createRouter({
      user: route({
        url: "/users/:userId",
        content: ({ params }) => params.userId,
      }),
    });

    expect(router.match("/users")).toBeNull();
  });

  it("resolves static redirects during matching", () => {
    const router = createRouter({
      legacy: route({
        url: "/old-blog/:slug",
        redirect: "/articles/:slug",
        status: 301,
      }),
    });

    expect(router.match("/old-blog/intro")).toMatchObject({
      kind: "redirect",
      name: "legacy",
      status: 301,
      params: { slug: "intro" },
      redirectTo: "/articles/intro",
      pathname: "/old-blog/intro",
    });
  });

  it("returns raw search params when a schema has no validator", () => {
    const router = createRouter({
      query: route({
        url: "/query",
        search: {
          "~standard": {
            output: {} as {
              q?: string;
              tag?: string;
            },
          },
        },
        content: () => "query",
      }),
    });

    expect(router.match("/query?q=router&tag=a")).toMatchObject({
      kind: "route",
      name: "query",
      search: {
        q: "router",
        tag: "a",
      },
    });
  });

  it("renders redirect targets for root and wildcard patterns", () => {
    const router = createRouter({
      rootRedirect: route({
        url: "/start",
        redirect: "/",
        status: 308,
      }),
      wildcardRedirect: route({
        url: "/legacy/*",
        redirect: "/archive/*",
        status: 308,
      }),
    });

    expect(router.match("/start")).toMatchObject({
      kind: "redirect",
      name: "rootRedirect",
      redirectTo: "/",
      status: 308,
    });
    // Wildcard redirects replace the entire path with the target — the
    // trailing segments after `*` are intentionally dropped. If a consumer
    // needs to preserve them they should use a fetch-time redirect instead.
    expect(router.match("/legacy/2020/intro")).toMatchObject({
      kind: "redirect",
      name: "wildcardRedirect",
      redirectTo: "/archive",
      status: 308,
    });
  });

  it("throws when a redirect target references a missing source param", () => {
    const router = createRouter({
      brokenRedirect: route({
        url: "/legacy",
        redirect: "/articles/:slug",
        status: 308,
      }),
    });

    expect(() => {
      router.match("/legacy");
    }).toThrow("Missing route param 'slug' for '/articles/:slug'.");
  });

  it("returns a 404 notFound match when no route matches", () => {
    const notFoundSearchSchema = {
      "~standard": {
        output: {} as { from?: string },
        validate(value: unknown) {
          const raw = value as { from?: string | string[] };

          return {
            from: Array.isArray(raw.from) ? raw.from[0] : raw.from,
          };
        },
      },
    };

    const notFoundRoute = route({
      url: "/*",
      content: () => "not-found",
      search: notFoundSearchSchema,
    });

    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
      },
      {
        notFound: notFoundRoute,
      },
    );

    expect(router.match("/missing?from=header")).toMatchObject({
      kind: "not-found",
      name: null,
      route: notFoundRoute,
      pathname: "/missing",
      status: 404,
      search: { from: "header" },
    });
  });

  it("returns null when no route matches and no notFound route is configured", () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    expect(router.match("/missing")).toBeNull();
  });

  it("rejects duplicate wrapper ids that point at distinct wrapper definitions", () => {
    const firstLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const secondLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const homeRoute = group(firstLayout, [
      route({
        url: "/",
        content: () => "home",
      }),
    ] as const)[0];

    const dashboardRoute = group(secondLayout, [
      route({
        url: "/dashboard",
        content: () => "dashboard",
      }),
    ] as const)[0];

    expect(() => {
      createRouter({
        home: homeRoute,
        dashboard: dashboardRoute,
      });
    }).toThrow(
      "Wrapper id 'app:layout' is attached to multiple wrapper definitions.",
    );
  });

  it("allows the same wrapper definition to be reused across routes", () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const homeRoute = group(appLayout, [
      route({
        url: "/",
        content: () => "home",
      }),
    ] as const)[0];

    const dashboardRoute = group(appLayout, [
      route({
        url: "/dashboard",
        content: () => "dashboard",
      }),
    ] as const)[0];

    expect(() => {
      createRouter({
        home: homeRoute,
        dashboard: dashboardRoute,
      });
    }).not.toThrow();
  });

  it("exposes a tracked location view and an external store", () => {
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
      },
      {
        initialUrl: "/?page=2#details",
      },
    );
    const accessed: string[] = [];

    const trackedLocation = router.getTrackedLocation((key) => {
      accessed.push(key);
    });

    expect(router.getState().location.href).toBe("/?page=2#details");
    expect(router.store.getSnapshot()).toMatchObject({
      href: "/?page=2#details",
      navigationState: "idle",
      pathname: "/",
      status: 200,
    });
    expect(trackedLocation.pathname).toBe("/");
    expect(trackedLocation.hash).toBe("#details");
    expect(accessed).toEqual(["pathname", "hash"]);
  });

  it("supports callback subscriptions for router state, search params, and navigation", () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });
    const stateListener = vi.fn();
    const pageListener = vi.fn();
    const navigationListener = vi.fn();

    router.subscribe(stateListener);
    router.subscribeToSearchParam("page", pageListener);
    router.subscribeToNavigation(navigationListener);

    router.store.setLocation("/?page=1");
    router.store.setNavigationState("loading");

    expect(stateListener).toHaveBeenCalledTimes(2);
    expect(pageListener).toHaveBeenCalledWith("1", null);
    expect(navigationListener).toHaveBeenCalledWith("loading", "idle");
  });

  it("applies middleware once at router creation time before matching and loading", async () => {
    const middleware = vi.fn((currentRoute: AnyRoute) => {
      if ("redirect" in currentRoute) {
        return {
          ...currentRoute,
          url: `/app${currentRoute.url}`,
        };
      }

      return {
        ...currentRoute,
        url: `/app${currentRoute.url}`,
      };
    }) as RouteMiddleware;
    const router = createRouter(
      {
        dashboard: route({
          url: "/dashboard",
          content: () => "dashboard",
        }),
      },
      {
        middleware: [middleware],
      },
    );

    expect(middleware).toHaveBeenCalledTimes(1);
    expect(router.buildPath("dashboard")).toBe("/app/dashboard");
    expect(router.getRoute("dashboard").parse("/app/dashboard")).toEqual({});
    expect(router.match("/dashboard")).toBeNull();
    expect(router.match("/app/dashboard")).toMatchObject({
      kind: "route",
      name: "dashboard",
    });

    const result = await router.load("/app/dashboard");

    expect(middleware).toHaveBeenCalledTimes(1);
    expect(router.render(result)).toBe("dashboard");
  });

  it("dehydrates and hydrates successful route results without re-running loaders", async () => {
    const serverRouter = createRouter({
      page: route({
        url: "/pages/:slug",
        content: ({ params }) => `page:${params.slug}`,
      }),
    });
    const loadResult = await serverRouter.load("/pages/hello");
    const dehydratedState = serverRouter.dehydrate();

    expect(loadResult.dehydrate()).toEqual({
      href: "/pages/hello",
      kind: "route",
      routeId: "page",
      status: 200,
    });
    expect(dehydratedState).toEqual(loadResult.dehydrate());

    const clientRouter = createRouter({
      page: route({
        url: "/pages/:slug",
        content: ({ params }) => `page:${params.slug}`,
      }),
    });

    clientRouter.hydrate(loadResult.dehydrate());

    expect(clientRouter.render()).toBe("page:hello");

    const hydratedResult = await clientRouter.load("/pages/hello");

    expect(hydratedResult.status).toBe(200);

    await clientRouter.load("/pages/other");
    await clientRouter.load("/pages/hello");
  });

  it("dehydrates not-found and unmatched states and returns null before the first load", async () => {
    const notFoundRoute = route({
      url: "/*",
      content: () => "not-found",
    });
    const notFoundRouter = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
      },
      {
        notFound: notFoundRoute,
      },
    );
    const unmatchedRouter = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    expect(unmatchedRouter.dehydrate()).toBeNull();

    const notFoundResult = await notFoundRouter.load("/missing");
    const unmatchedResult = await unmatchedRouter.load("/missing");

    expect(notFoundResult.dehydrate()).toEqual({
      href: "/missing",
      kind: "not-found",
      routeId: null,
      status: 404,
    });
    expect(unmatchedResult.dehydrate()).toEqual({
      href: "/missing",
      kind: "unmatched",
      routeId: null,
      status: 404,
    });

    const hydratedNotFoundRouter = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
      },
      {
        notFound: notFoundRoute,
      },
    );

    hydratedNotFoundRouter.hydrate(notFoundResult.dehydrate());

    expect(hydratedNotFoundRouter.render()).toBe("not-found");

    const hydratedUnmatchedRouter = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    hydratedUnmatchedRouter.hydrate(unmatchedResult.dehydrate());

    expect(hydratedUnmatchedRouter.render()).toBeNull();
  });

  it("rejects incompatible hydrated state", () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    expect(() => {
      router.hydrate({
        href: "/",
        kind: "route",
        routeId: "missing" as never,
        status: 200,
      });
    }).toThrow("Hydrated route state does not match the current route map.");

    expect(() => {
      router.hydrate({
        href: "/",
        kind: "unmatched",
        routeId: null,
        status: 404,
      });
    }).toThrow(
      "Hydrated unmatched state does not match the current route map.",
    );

    expect(() => {
      router.hydrate({
        href: "/missing",
        kind: "not-found",
        routeId: null,
        status: 404,
      });
    }).toThrow(
      "Hydrated not-found state does not match the current route map.",
    );
  });

  it("prefetches lazy content without mutating router state", async () => {
    const prefetchSpy = vi.fn(async () => {});
    const preloadSpy = vi.fn(async () => ({ default: "SettingsPage" }));
    const content = Object.assign(() => "settings", {
      preload: preloadSpy,
    });
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
      settings: route({
        url: "/settings",
        prefetch: prefetchSpy,
        content,
      }),
    });

    await router.prefetch("settings");
    await router.prefetch("settings");

    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.getState().location.href).toBe("/");
    expect(router.getState().navigation.state).toBe("idle");
    expect(router.render()).toBeNull();

    const result = await router.load("/settings");

    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.render(result)).toBe("settings");

    await router.prefetch("settings");

    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses an in-flight prefetch when a matching load starts", async () => {
    let resolvePreload: ((value: { default: string }) => void) | null = null;
    const preloadSpy = vi.fn(() => {
      return new Promise<{ default: string }>((resolve) => {
        resolvePreload = resolve;
      });
    });
    const content = Object.assign(() => "docs", {
      preload: preloadSpy,
    });
    const router = createRouter({
      docs: route({
        url: "/docs",
        content,
      }),
    });

    const prefetchPromise = router.prefetch("docs");
    const loadPromise = router.load("/docs");

    (resolvePreload as unknown as (value: { default: string }) => void)({
      default: "DocsPage",
    });

    await prefetchPromise;
    const result = await loadPromise;

    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.render(result)).toBe("docs");
  });

  it("deduplicates concurrent prefetch calls for the same href", async () => {
    let resolvePreload: ((value: { default: string }) => void) | null = null;
    const preloadSpy = vi.fn(() => {
      return new Promise<{ default: string }>((resolve) => {
        resolvePreload = resolve;
      });
    });
    const router = createRouter({
      docs: route({
        url: "/docs",
        content: Object.assign(() => "docs", { preload: preloadSpy }),
      }),
    });

    const firstPrefetch = router.prefetch("docs");
    const secondPrefetch = router.prefetch("docs");

    (resolvePreload as unknown as (value: { default: string }) => void)({
      default: "DocsPage",
    });

    await Promise.all([firstPrefetch, secondPrefetch]);

    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it("surfaces non-redirect prefetch failures and clears the pending entry", async () => {
    const preloadSpy = vi
      .fn<() => Promise<{ default: string }>>()
      .mockRejectedValueOnce(new Error("prefetch-failure"))
      .mockResolvedValueOnce({ default: "RecoveredPage" });
    const router = createRouter({
      broken: route({
        url: "/broken",
        content: Object.assign(() => "broken", { preload: preloadSpy }),
      }),
    });

    await expect(router.prefetch("broken")).rejects.toThrow("prefetch-failure");
    await expect(router.prefetch("broken")).resolves.toBeUndefined();

    expect(preloadSpy).toHaveBeenCalledTimes(2);
  });

  it("aborts a load that is waiting on an in-flight prefetch when a newer load starts", async () => {
    let resolvePreload: ((value: { default: string }) => void) | null = null;
    const preloadSpy = vi.fn(() => {
      return new Promise<{ default: string }>((resolve) => {
        resolvePreload = resolve;
      });
    });
    const router = createRouter({
      docs: route({
        url: "/docs",
        content: Object.assign(() => "docs", { preload: preloadSpy }),
      }),
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    const prefetchPromise = router.prefetch("docs");
    const firstLoad = router.load("/docs");
    const secondLoad = router.load("/");

    (resolvePreload as unknown as (value: { default: string }) => void)({
      default: "DocsPage",
    });

    await prefetchPromise;

    await expect(firstLoad).rejects.toThrow("aborted");
    await expect(secondLoad).resolves.toMatchObject({
      location: { href: "/" },
      status: 200,
    });
    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it("throws after an excessive redirect loop during prefetch", async () => {
    const router = createRouter({
      loop: route({
        url: "/loop",
        redirect: "/loop",
        status: 308,
      }),
    });

    await expect(router.prefetch("loop")).rejects.toThrow(
      "Too many redirects during router.prefetch().",
    );
  });

  it("drops cached preloaded modules when the finalization cleanup runs", async () => {
    const originalFinalizationRegistry = globalThis.FinalizationRegistry;
    let cleanupCallback: ((key: string) => void) | null = null;

    class FakeFinalizationRegistry {
      constructor(callback: (key: string) => void) {
        cleanupCallback = callback;
      }

      register(): void {}
    }

    (
      globalThis as unknown as {
        FinalizationRegistry: typeof FinalizationRegistry;
      }
    ).FinalizationRegistry =
      FakeFinalizationRegistry as unknown as typeof FinalizationRegistry;

    try {
      const preloadSpy = vi.fn(async () => ({ default: "DocsPage" }));
      const router = createRouter({
        docs: route({
          url: "/docs",
          content: Object.assign(() => "docs", {
            preload: preloadSpy,
          }),
        }),
      });

      await router.prefetch("docs");
      await router.load("/docs");

      (cleanupCallback as unknown as (key: string) => void)("docs");
      await router.prefetch("docs");

      expect(preloadSpy).toHaveBeenCalledTimes(2);
    } finally {
      (
        globalThis as unknown as {
          FinalizationRegistry: typeof FinalizationRegistry;
        }
      ).FinalizationRegistry = originalFinalizationRegistry;
    }
  });

  it("preloads not-found content when the not-found route exposes a preload hook", async () => {
    const preloadSpy = vi.fn(async () => ({ default: "NotFoundPage" }));
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
      },
      {
        notFound: route({
          url: "/*",
          content: Object.assign(() => "not-found", {
            preload: preloadSpy,
          }),
        }),
      },
    );

    await router.load("/missing");

    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.render()).toBe("not-found");
  });

  it("follows static redirects during prefetch", async () => {
    const modernPreload = vi.fn(async () => ({ default: "ModernPage" }));
    const router = createRouter({
      legacy: route({
        url: "/legacy",
        redirect: "/modern",
        status: 308,
      }),
      modern: route({
        url: "/modern",
        content: Object.assign(() => "modern", {
          preload: modernPreload,
        }),
      }),
    });

    await router.prefetch("legacy");

    expect(modernPreload).toHaveBeenCalledTimes(1);

    const legacyResult = await router.load("/legacy");

    expect(router.render(legacyResult)).toBe("modern");
  });

  it("syncs loads with a memory adapter and stops after dispose", async () => {
    const adapter = createMemoryAdapter("/users/42");
    const router = createRouter(
      {
        home: route({
          url: "/",
          content: () => "home",
        }),
        user: route({
          url: "/users/:userId",
          content: ({ params }) => `user:${params.userId}`,
        }),
      },
      {
        adapter,
      },
    );

    await vi.waitFor(() => {
      expect(router.getState().location.href).toBe("/users/42");
      expect(router.render()).toBe("user:42");
    });

    router.navigate("home");

    await vi.waitFor(() => {
      expect(router.getState().location.href).toBe("/");
      expect(router.render()).toBe("home");
    });

    adapter.back();

    await vi.waitFor(() => {
      expect(router.getState().location.href).toBe("/users/42");
      expect(router.render()).toBe("user:42");
    });

    router.dispose();
    adapter.navigate("/ignored");

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(router.getState().location.href).toBe("/users/42");
  });

  it("keeps the adapter location in sync with static redirects", async () => {
    const adapter = createMemoryAdapter("/legacy");
    const router = createRouter(
      {
        legacy: route({
          url: "/legacy",
          redirect: "/modern",
          status: 308,
        }),
        modern: route({
          url: "/modern",
          content: () => "modern",
        }),
      },
      {
        adapter,
      },
    );

    await vi.waitFor(() => {
      expect(router.getState().location.href).toBe("/modern");
      expect(adapter.getLocation()).toMatchObject({ pathname: "/modern" });
      expect(router.render()).toBe("modern");
    });
  });

  it("swallows scheduled adapter load failures such as redirect loops", async () => {
    const adapter = createMemoryAdapter("/loop");
    const router = createRouter(
      {
        loop: route({
          url: "/loop",
          redirect: "/loop",
          status: 308,
        }),
      },
      {
        adapter,
      },
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(router.getState().location.href).toBe("/loop");
    expect(adapter.getLocation()).toMatchObject({ pathname: "/loop" });
  });

  it("renders route content through wrapper continuations", async () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => `app(${String(children)})`,
    });

    const sectionLayout = wrapper({
      id: "section:layout",
      component: ({ children }) => `section(${String(children)})`,
    });

    const sectionRoutes = group(sectionLayout, [
      route({
        url: "/users/:userId",
        content: ({ params }) => `content(user:${params.userId})`,
      }),
    ] as const);
    const [detailsRoute] = group(appLayout, sectionRoutes);

    const router = createRouter({
      details: detailsRoute,
    });

    const result = await router.load("/users/42");

    expect(result).toMatchObject({
      error: null,
      status: 200,
    });
    expect(router.render(result)).toBe("app(section(content(user:42)))");
  });

  it("follows static redirects client-side", async () => {
    const router = createRouter({
      oldHome: route({
        url: "/old-home",
        redirect: "/home",
        status: 308,
      }),
      home: route({
        url: "/home",
        content: () => "home",
      }),
    });

    const staticRedirectResult = await router.load("/old-home");

    expect(staticRedirectResult.location.href).toBe("/home");
    expect(staticRedirectResult.match).toMatchObject({
      kind: "route",
      name: "home",
    });
  });

  it("commits the latest load result even when an earlier load resolves later", async () => {
    let resolvePreload: (() => void) | null = null;
    const slowPreload = vi.fn(
      () =>
        new Promise<{ default: string }>((resolve) => {
          resolvePreload = () => resolve({ default: "SlowPage" });
        }),
    );
    const router = createRouter({
      slow: route({
        url: "/slow",
        content: Object.assign(() => "slow", { preload: slowPreload }),
      }),
      fast: route({
        url: "/fast",
        content: () => "fast",
      }),
    });

    const firstLoad = router.load("/slow");

    // Ensure the slow preload has started
    expect(slowPreload).toHaveBeenCalledTimes(1);

    const secondLoad = router.load("/fast");

    await expect(secondLoad).resolves.toMatchObject({
      location: { href: "/fast" },
      status: 200,
    });

    // Resolve the slow preload after the fast load committed
    resolvePreload?.();

    const firstResult = await firstLoad;

    expect(firstResult).toMatchObject({
      location: { href: "/slow" },
      status: 200,
    });
    expect(router.getState().navigation.state).toBe("idle");
  });

  it("returns a 404 load result for unmatched URLs when no notFound route exists", async () => {
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    const result = await router.load("/missing");

    expect(result).toMatchObject({
      error: null,
      match: null,
      status: 404,
    });
    expect(router.render(result)).toBeNull();
  });

  it("surfaces content preload errors through the error property", async () => {
    const router = createRouter({
      broken: route({
        url: "/broken",
        content: Object.assign(() => "broken", {
          preload: async () => {
            throw new StatusResponse(503, { message: "Back soon" });
          },
        }),
      }),
    });

    const result = await router.load("/broken");

    expect(result.status).toBe(503);
    expect(result.error).toBeInstanceOf(StatusResponse);
  });

  it("returns null when asked to render a redirect match payload", () => {
    const router = createRouter({
      legacy: route({
        url: "/legacy",
        redirect: "/modern",
        status: 308,
      }),
    });
    const redirectMatch = router.match("/legacy");

    expect(
      router.render({
        error: null,
        location: {
          hash: "",
          href: "/legacy",
          pathname: "/legacy",
          searchParams: new URLSearchParams(),
          status: 308,
          url: new URL("https://example.com/legacy"),
        },
        match: redirectMatch,
        status: 308,
      } as never),
    ).toBeNull();
  });

  it("throws after an excessive redirect loop", async () => {
    const router = createRouter({
      loop: route({
        url: "/loop",
        redirect: "/loop",
        status: 308,
      }),
    });

    await expect(router.load("/loop")).rejects.toThrow(
      "Too many redirects during router.load().",
    );
  });

  it("rejects duplicate wrapper ids that appear twice on a single route", () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => children,
    });

    const brokenRoute = route({
      url: "/broken",
      content: () => "broken",
      wrappers: [appLayout, appLayout] as const,
    });

    expect(() => {
      createRouter({
        broken: brokenRoute,
      });
    }).toThrow(
      "Route 'broken' contains wrapper id 'app:layout' more than once.",
    );
  });

  it("aborts in-flight loads when dispose is called", async () => {
    let resolvePreload: (() => void) | null = null;

    const slowRoute = route({
      url: "/slow",
      content: Object.assign(() => "slow", {
        preload: () =>
          new Promise<{ default: string }>((resolve) => {
            resolvePreload = () => resolve({ default: "SlowPage" });
          }),
      }),
    });

    const adapter = createMemoryAdapter("/");
    const router = createRouter({ slow: slowRoute }, { adapter });

    const loadPromise = router.load("/slow");

    // Wait a tick for the preload to start
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(resolvePreload).toBeDefined();

    router.dispose();

    // Resolve the preload so the promise settles
    resolvePreload?.();

    // The load may resolve (router catches AbortError internally) or reject
    // depending on timing. Either way, the router was disposed.
    try {
      await loadPromise;
    } catch {
      // AbortError propagation is acceptable
    }
  });

  it("merges search params into the current URL via setSearchParams", async () => {
    const router = createRouter(
      {
        list: route({
          url: "/list",
          content: () => "list",
        }),
      },
      { adapter: createMemoryAdapter("/list?sort=name") },
    );

    await router.load("/list?sort=name");
    router.setSearchParams({ page: "2" });

    await vi.waitFor(() => {
      expect(router.getState().location.searchParams.get("sort")).toBe("name");
      expect(router.getState().location.searchParams.get("page")).toBe("2");
    });
  });

  it("removes search params when set to null via setSearchParams", async () => {
    const router = createRouter(
      {
        list: route({
          url: "/list",
          content: () => "list",
        }),
      },
      { adapter: createMemoryAdapter("/list?sort=name&page=2") },
    );

    await router.load("/list?sort=name&page=2");
    router.setSearchParams({ page: null });

    await vi.waitFor(() => {
      expect(router.getState().location.searchParams.get("sort")).toBe("name");
      expect(router.getState().location.searchParams.has("page")).toBe(false);
    });
  });

  it("blocks navigation when an active blocker is registered", async () => {
    const router = createRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      { adapter: createMemoryAdapter("/") },
    );

    await router.load("/");

    router.registerBlocker({ id: "form", isActive: () => true });
    router.navigate("about");

    expect(router.blockerState).toBe("blocked");
    expect(router.getState().location.pathname).toBe("/");

    router.proceedNavigation();

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });

    expect(router.blockerState).toBe("idle");
  });

  it("cancels blocked navigation and stays on the current page", async () => {
    const router = createRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      { adapter: createMemoryAdapter("/") },
    );

    await router.load("/");

    router.registerBlocker({ id: "form", isActive: () => true });
    router.navigate("about");

    expect(router.blockerState).toBe("blocked");
    router.cancelNavigation();

    expect(router.blockerState).toBe("idle");
    expect(router.getState().location.pathname).toBe("/");
  });

  it("allows navigation when no active blocker is registered", async () => {
    const router = createRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      { adapter: createMemoryAdapter("/") },
    );

    await router.load("/");

    router.registerBlocker({ id: "form", isActive: () => false });
    router.navigate("about");

    expect(router.blockerState).toBe("idle");

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });
  });

  it("removes blockers on unregister", async () => {
    const router = createRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      { adapter: createMemoryAdapter("/") },
    );

    await router.load("/");

    router.registerBlocker({ id: "form", isActive: () => true });
    router.unregisterBlocker("form");
    router.navigate("about");

    expect(router.blockerState).toBe("idle");

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });
  });

  it("supports functional updates via setSearchParams", async () => {
    const router = createRouter(
      {
        list: route({
          url: "/list",
          content: () => "list",
        }),
      },
      { adapter: createMemoryAdapter("/list?page=1") },
    );

    await router.load("/list?page=1");
    router.setSearchParams((current) => ({
      ...current,
      page: String(Number(current.page ?? "0") + 1),
    }));

    await vi.waitFor(() => {
      expect(router.getState().location.searchParams.get("page")).toBe("2");
    });
  });
});
