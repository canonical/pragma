import { describe, expect, expectTypeOf, it, vi } from "vitest";
import createMemoryAdapter from "./createMemoryAdapter.js";
import createRouter from "./createRouter.js";
import group from "./group.js";
import redirect from "./redirect.js";
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
    const fetchSpy = vi.fn(async () => "dashboard-data");
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
        fetch: currentRoute.fetch
          ? async (params: unknown, search: unknown, context: unknown) => {
              const data = await currentRoute.fetch?.(
                params,
                search,
                context as never,
              );

              return `mw(${String(data)})`;
            }
          : undefined,
      };
    }) as RouteMiddleware;
    const router = createRouter(
      {
        dashboard: route({
          url: "/dashboard",
          fetch: fetchSpy,
          content: ({ data }) => String(data),
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

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(middleware).toHaveBeenCalledTimes(1);
    expect(result.routeData).toBe("mw(dashboard-data)");
    expect(router.render(result)).toBe("mw(dashboard-data)");
  });

  it("dehydrates and hydrates successful route results without re-running loaders", async () => {
    const fetchSpy = vi.fn(
      async ({ slug }: { slug: string }) => `page:${slug}`,
    );
    const serverRouter = createRouter({
      page: route({
        url: "/pages/:slug",
        fetch: fetchSpy,
        content: ({ data }) => String(data),
      }),
    });
    const loadResult = await serverRouter.load("/pages/hello");
    const dehydratedState = serverRouter.dehydrate();

    expect(loadResult.dehydrate()).toEqual({
      href: "/pages/hello",
      kind: "route",
      routeData: "page:hello",
      routeId: "page",
      status: 200,
      wrapperData: {},
    });
    expect(dehydratedState).toEqual(loadResult.dehydrate());

    const clientRouter = createRouter({
      page: route({
        url: "/pages/:slug",
        fetch: fetchSpy,
        content: ({ data }) => String(data),
      }),
    });

    clientRouter.hydrate(loadResult.dehydrate());

    expect(clientRouter.render()).toBe("page:hello");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const hydratedResult = await clientRouter.load("/pages/hello");

    expect(hydratedResult.routeData).toBe("page:hello");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await clientRouter.load("/pages/other");
    await clientRouter.load("/pages/hello");

    expect(fetchSpy).toHaveBeenCalledTimes(3);
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
      routeData: undefined,
      routeId: null,
      status: 404,
      wrapperData: {},
    });
    expect(unmatchedResult.dehydrate()).toEqual({
      href: "/missing",
      kind: "unmatched",
      routeData: undefined,
      routeId: null,
      status: 404,
      wrapperData: {},
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
        routeData: "home",
        routeId: "missing" as never,
        status: 200,
        wrapperData: {},
      });
    }).toThrow("Hydrated route state does not match the current route map.");

    expect(() => {
      router.hydrate({
        href: "/",
        kind: "unmatched",
        routeData: undefined,
        routeId: null,
        status: 404,
        wrapperData: {},
      });
    }).toThrow(
      "Hydrated unmatched state does not match the current route map.",
    );

    expect(() => {
      router.hydrate({
        href: "/missing",
        kind: "not-found",
        routeData: undefined,
        routeId: null,
        status: 404,
        wrapperData: {},
      });
    }).toThrow(
      "Hydrated not-found state does not match the current route map.",
    );
  });

  it("prefetches data and lazy content without mutating router state", async () => {
    const fetchSpy = vi.fn(async () => "settings-data");
    const preloadSpy = vi.fn(async () => ({ default: "SettingsPage" }));
    const content = Object.assign(
      ({ data }: { data: unknown }) => String(data),
      { preload: preloadSpy },
    );
    const router = createRouter({
      home: route({
        url: "/",
        content: () => "home",
      }),
      settings: route({
        url: "/settings",
        fetch: fetchSpy,
        content,
      }),
    });

    await router.prefetch("settings");
    await router.prefetch("settings");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.getState().location.href).toBe("/");
    expect(router.getState().navigation.state).toBe("idle");
    expect(router.render()).toBeNull();

    const result = await router.load("/settings");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.render(result)).toBe("settings-data");

    await router.prefetch("settings");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses an in-flight prefetch when a matching load starts", async () => {
    let resolveFetch: ((value: string) => void) | null = null;
    const fetchSpy = vi.fn(() => {
      return new Promise<string>((resolve) => {
        resolveFetch = resolve;
      });
    });
    const preloadSpy = vi.fn(async () => ({ default: "DocsPage" }));
    const content = Object.assign(
      ({ data }: { data: unknown }) => String(data),
      {
        preload: preloadSpy,
      },
    );
    const router = createRouter({
      docs: route({
        url: "/docs",
        fetch: fetchSpy,
        content,
      }),
    });

    const prefetchPromise = router.prefetch("docs");
    const loadPromise = router.load("/docs");

    (resolveFetch as unknown as (value: string) => void)("docs-data");

    await prefetchPromise;
    const result = await loadPromise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(preloadSpy).toHaveBeenCalledTimes(1);
    expect(router.render(result)).toBe("docs-data");
  });

  it("deduplicates concurrent prefetch calls for the same href", async () => {
    let resolveFetch: ((value: string) => void) | null = null;
    const fetchSpy = vi.fn(() => {
      return new Promise<string>((resolve) => {
        resolveFetch = resolve;
      });
    });
    const router = createRouter({
      docs: route({
        url: "/docs",
        fetch: fetchSpy,
        content: ({ data }) => String(data),
      }),
    });

    const firstPrefetch = router.prefetch("docs");
    const secondPrefetch = router.prefetch("docs");

    (resolveFetch as unknown as (value: string) => void)("docs-data");

    await Promise.all([firstPrefetch, secondPrefetch]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("surfaces non-redirect prefetch failures and clears the pending entry", async () => {
    const fetchSpy = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("prefetch-failure"))
      .mockResolvedValueOnce("recovered");
    const router = createRouter({
      broken: route({
        url: "/broken",
        fetch: fetchSpy,
        content: ({ data }) => String(data),
      }),
    });

    await expect(router.prefetch("broken")).rejects.toThrow("prefetch-failure");
    await expect(router.prefetch("broken")).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("aborts a load that is waiting on an in-flight prefetch when a newer load starts", async () => {
    let resolveFetch: ((value: string) => void) | null = null;
    const fetchSpy = vi.fn(() => {
      return new Promise<string>((resolve) => {
        resolveFetch = resolve;
      });
    });
    const router = createRouter({
      docs: route({
        url: "/docs",
        fetch: fetchSpy,
        content: ({ data }) => String(data),
      }),
      home: route({
        url: "/",
        content: () => "home",
      }),
    });

    const prefetchPromise = router.prefetch("docs");
    const firstLoad = router.load("/docs");
    const secondLoad = router.load("/");

    (resolveFetch as unknown as (value: string) => void)("docs-data");

    await prefetchPromise;

    await expect(firstLoad).rejects.toThrow("aborted");
    await expect(secondLoad).resolves.toMatchObject({
      location: { href: "/" },
      status: 200,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
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
          fetch: async () => "docs-data",
          content: Object.assign(
            ({ data }: { data: unknown }) => String(data),
            {
              preload: preloadSpy,
            },
          ),
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

  it("follows static and thrown redirects during prefetch", async () => {
    const modernFetch = vi.fn(async () => "modern-data");
    const loginFetch = vi.fn(async () => "login-data");
    const modernPreload = vi.fn(async () => ({ default: "ModernPage" }));
    const loginPreload = vi.fn(async () => ({ default: "LoginPage" }));
    const router = createRouter({
      legacy: route({
        url: "/legacy",
        redirect: "/modern",
        status: 308,
      }),
      modern: route({
        url: "/modern",
        fetch: modernFetch,
        content: Object.assign(({ data }: { data: unknown }) => String(data), {
          preload: modernPreload,
        }),
      }),
      private: route({
        url: "/private",
        fetch: async (): Promise<string> => {
          redirect("/login", 302);
        },
        content: () => "private",
      }),
      login: route({
        url: "/login",
        fetch: loginFetch,
        content: Object.assign(({ data }: { data: unknown }) => String(data), {
          preload: loginPreload,
        }),
      }),
    });

    await router.prefetch("legacy");
    await router.prefetch("private");

    expect(modernFetch).toHaveBeenCalledTimes(1);
    expect(loginFetch).toHaveBeenCalledTimes(1);
    expect(modernPreload).toHaveBeenCalledTimes(1);
    expect(loginPreload).toHaveBeenCalledTimes(1);

    const legacyResult = await router.load("/legacy");

    expect(modernFetch).toHaveBeenCalledTimes(1);
    expect(router.render(legacyResult)).toBe("modern-data");

    // After a navigation commits, the prefetch cache is cleared so stale
    // entries do not persist. The second load re-fetches as expected.
    const privateResult = await router.load("/private");

    expect(loginFetch).toHaveBeenCalledTimes(2);
    expect(router.render(privateResult)).toBe("login-data");
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
          fetch: async ({ userId }) => `user:${userId}`,
          content: ({ data }) => String(data),
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

  it("keeps the adapter location in sync with static and thrown redirects", async () => {
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
        private: route({
          url: "/private",
          fetch: async (): Promise<string> => {
            redirect("/login", 302);
          },
          content: () => "private",
        }),
        login: route({
          url: "/login",
          content: () => "login",
        }),
      },
      {
        adapter,
      },
    );

    await vi.waitFor(() => {
      expect(router.getState().location.href).toBe("/modern");
      expect(adapter.getLocation()).toMatchObject({ pathname: "/modern" });
    });

    router.navigate("private");

    await vi.waitFor(() => {
      expect(router.getState().location.href).toBe("/login");
      expect(adapter.getLocation()).toMatchObject({ pathname: "/login" });
      expect(router.render()).toBe("login");
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

  it("loads route and wrapper data, then renders via wrapper continuations", async () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children, data }) =>
        `app(${String(data)}:${String(children)})`,
      fetch: async () => "app-data",
    });

    const sectionLayout = wrapper({
      id: "section:layout",
      component: ({ children, data }) =>
        `section(${String(data)}:${String(children)})`,
      fetch: async () => "section-data",
    });

    const sectionRoutes = group(sectionLayout, [
      route({
        url: "/users/:userId",
        fetch: async ({ userId }) => `user:${userId}`,
        content: ({ data }) => `content(${String(data)})`,
      }),
    ] as const);
    const [detailsRoute] = group(appLayout, sectionRoutes);

    const router = createRouter({
      details: detailsRoute,
    });

    const result = await router.load("/users/42");

    expect(result).toMatchObject({
      error: null,
      routeData: "user:42",
      status: 200,
      wrapperData: {
        "app:layout": "app-data",
        "section:layout": "section-data",
      },
    });
    expect(router.render(result)).toBe(
      "app(app-data:section(section-data:content(user:42)))",
    );
  });

  it("reuses shared wrapper data across sibling navigations", async () => {
    const sharedFetch = vi.fn(async () => "shared-data");
    const routeFetch = vi.fn(async ({ userId }: { userId: string }) => userId);
    const sharedLayout = wrapper({
      id: "shared:layout",
      component: ({ children }) => children,
      fetch: sharedFetch,
    });

    const [firstRoute] = group(sharedLayout, [
      route({
        url: "/users/:userId",
        fetch: routeFetch,
        content: ({ data }) => data,
      }),
    ] as const);

    const [secondRoute] = group(sharedLayout, [
      route({
        url: "/profiles/:userId",
        fetch: routeFetch,
        content: ({ data }) => data,
      }),
    ] as const);

    const router = createRouter({
      first: firstRoute,
      second: secondRoute,
    });

    const firstResult = await router.load("/users/42");
    const secondResult = await router.load("/profiles/84");

    expect(sharedFetch).toHaveBeenCalledTimes(1);
    expect(routeFetch).toHaveBeenCalledTimes(2);
    expect(firstResult.wrapperData["shared:layout"]).toBe("shared-data");
    expect(secondResult.wrapperData["shared:layout"]).toBe("shared-data");
  });

  it("follows static and thrown redirects client-side", async () => {
    const router = createRouter({
      oldHome: route({
        url: "/old-home",
        redirect: "/home",
        status: 308,
      }),
      private: route({
        url: "/private",
        fetch: async (): Promise<string> => {
          redirect("/login", 302);
        },
        content: () => "private",
      }),
      home: route({
        url: "/home",
        content: () => "home",
      }),
      login: route({
        url: "/login",
        content: () => "login",
      }),
    });

    const staticRedirectResult = await router.load("/old-home");
    const thrownRedirectResult = await router.load("/private");

    expect(staticRedirectResult.location.href).toBe("/home");
    expect(staticRedirectResult.match).toMatchObject({
      kind: "route",
      name: "home",
    });
    expect(thrownRedirectResult.location.href).toBe("/login");
    expect(thrownRedirectResult.match).toMatchObject({
      kind: "route",
      name: "login",
    });
  });

  it("aborts the previous navigation when a new load starts", async () => {
    const router = createRouter({
      slow: route({
        url: "/slow",
        fetch: async (_params, _search, context) => {
          return await new Promise<string>((resolve, reject) => {
            context.signal.addEventListener("abort", () => {
              reject(new Error("aborted"));
            });

            setTimeout(() => {
              resolve("slow");
            }, 50);
          });
        },
        content: ({ data }) => data,
      }),
      fast: route({
        url: "/fast",
        fetch: async () => "fast",
        content: ({ data }) => data,
      }),
    });

    const firstLoad = router.load("/slow");
    const secondLoad = router.load("/fast");

    await expect(firstLoad).rejects.toThrow("aborted");
    await expect(secondLoad).resolves.toMatchObject({
      location: { href: "/fast" },
      routeData: "fast",
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

  it("renders route and wrapper error boundaries from load failures", async () => {
    const appLayout = wrapper({
      id: "app:layout",
      component: ({ children }) => `app(${String(children)})`,
    });
    const guardedLayout = wrapper({
      id: "guard:layout",
      component: ({ children }) => `guard(${String(children)})`,
      fetch: async (): Promise<string> => {
        throw new Response("Unauthorized", { status: 401 });
      },
      error: ({ status }) => `guard-error(${status})`,
    });

    const guardedRoutes = group(guardedLayout, [
      route({
        url: "/guarded",
        content: () => "guarded",
      }),
    ] as const);
    const [guardedRoute] = group(appLayout, guardedRoutes);

    const routerWithWrapperError = createRouter({
      guarded: guardedRoute,
    });
    const wrapperErrorResult = await routerWithWrapperError.load("/guarded");

    expect(wrapperErrorResult).toMatchObject({
      errorBoundary: { type: "wrapper", wrapperId: "guard:layout" },
      status: 401,
    });
    expect(routerWithWrapperError.render(wrapperErrorResult)).toBe(
      "app(guard-error(401))",
    );

    const routerWithRouteError = createRouter({
      broken: group(appLayout, [
        route({
          url: "/broken",
          fetch: async (): Promise<string> => {
            throw new StatusResponse(503, { message: "Back soon" });
          },
          content: () => "broken",
          error: ({ status }) => `route-error(${status})`,
        }),
      ] as const)[0],
    });
    const routeErrorResult = await routerWithRouteError.load("/broken");

    expect(routeErrorResult).toMatchObject({
      errorBoundary: { type: "route", wrapperId: null },
      status: 503,
    });
    expect(routerWithRouteError.render(routeErrorResult)).toBe(
      "app(route-error(503))",
    );
  });

  it("bubbles route load errors to wrapper boundaries when the route has no error renderer", async () => {
    const shell = wrapper({
      id: "shell:layout",
      component: ({ children }) => `shell(${String(children)})`,
      error: ({ status }) => `shell-error(${status})`,
    });
    const [brokenRoute] = group(shell, [
      route({
        url: "/broken",
        fetch: async (): Promise<string> => {
          throw new Response("Not found", { status: 404 });
        },
        content: () => "broken",
      }),
    ] as const);
    const router = createRouter({
      broken: brokenRoute,
    });

    const result = await router.load("/broken");

    expect(result.errorBoundary).toEqual({
      type: "wrapper",
      wrapperId: "shell:layout",
    });
    expect(router.render(result)).toBe("shell-error(404)");
  });

  it("reuses wrapper data when a later load on the same route fails", async () => {
    const shellFetch = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue("shell-data");
    const routeFetch = vi
      .fn<(params: { slug: string }) => Promise<string>>()
      .mockResolvedValueOnce("first")
      .mockRejectedValueOnce(new Error("boom"));
    const shell = wrapper({
      id: "shell:layout",
      component: ({ children, data }) =>
        `shell(${String(data)}:${String(children)})`,
      fetch: shellFetch,
    });
    const [pageRoute] = group(shell, [
      route({
        url: "/pages/:slug",
        fetch: routeFetch,
        content: ({ data }) => String(data),
      }),
    ] as const);
    const router = createRouter({
      page: pageRoute,
    });

    await router.load("/pages/one");
    const errorResult = await router.load("/pages/one");

    expect(shellFetch).toHaveBeenCalledTimes(1);
    expect(errorResult.wrapperData).toEqual({
      "shell:layout": "shell-data",
    });
    expect(router.render(errorResult)).toBeInstanceOf(Error);
  });

  it("returns raw errors from render when no error boundary exists", async () => {
    const router = createRouter({
      broken: route({
        url: "/broken",
        fetch: async (): Promise<string> => {
          throw "no-boundary";
        },
        content: () => "broken",
      }),
    });

    const result = await router.load("/broken");
    const rendered = router.render(result);

    expect(result.errorBoundary).toBeNull();
    expect(rendered).toBe("no-boundary");
  });

  it("returns raw wrapper-load errors when no wrapper boundary exists", async () => {
    const shell = wrapper({
      id: "shell:layout",
      component: ({ children }) => children,
      fetch: async (): Promise<string> => {
        throw new Error("wrapper-failure");
      },
    });
    const [brokenRoute] = group(shell, [
      route({
        url: "/broken",
        content: () => "broken",
      }),
    ] as const);
    const router = createRouter({
      broken: brokenRoute,
    });

    const result = await router.load("/broken");
    const rendered = router.render(result);

    expect(result.errorBoundary).toBeNull();
    expect(rendered).toBeInstanceOf(Error);
    expect((rendered as Error).message).toBe("wrapper-failure");
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
        errorBoundary: null,
        location: {
          hash: "",
          href: "/legacy",
          pathname: "/legacy",
          searchParams: new URLSearchParams(),
          status: 308,
          url: new URL("https://example.com/legacy"),
        },
        match: redirectMatch,
        routeData: undefined,
        status: 308,
        wrapperData: {},
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
    let capturedSignal: AbortSignal | undefined;

    const slowRoute = route({
      url: "/slow",
      fetch: async (
        _params: Record<string, never>,
        _search: unknown,
        context: { signal: AbortSignal },
      ) => {
        capturedSignal = context.signal;

        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 60_000);

          context.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
      content: () => "slow",
    });

    const adapter = createMemoryAdapter("/");
    const router = createRouter({ slow: slowRoute }, { adapter });

    const loadPromise = router.load("/slow");

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    router.dispose();

    expect(capturedSignal?.aborted).toBe(true);

    // The load may resolve (router catches AbortError internally) or reject
    // depending on timing. Either way, the signal was aborted.
    try {
      await loadPromise;
    } catch {
      // AbortError propagation is acceptable
    }
  });
});
