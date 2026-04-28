import { describe, expect, it } from "vitest";
import applyMiddleware from "./applyMiddleware.js";
import route from "./route.js";
import type { RouteMiddleware } from "./types.js";

describe("applyMiddleware", () => {
  it("composes middleware from outermost to innermost based on array order", () => {
    const baseRoute = route({
      url: "/demo",
      content: () => "content",
    });

    const middlewareA = ((currentRoute: typeof baseRoute) => {
      return {
        ...currentRoute,
        content: (props) => `A(${currentRoute.content(props)})`,
      };
    }) as RouteMiddleware;

    const middlewareB = ((currentRoute: typeof baseRoute) => {
      return {
        ...currentRoute,
        content: (props) => `B(${currentRoute.content(props)})`,
      };
    }) as RouteMiddleware;

    const [enhancedRoute] = applyMiddleware([baseRoute] as const, [
      middlewareA,
      middlewareB,
    ]);

    expect(
      enhancedRoute.content({
        params: {},
        search: {},
      }),
    ).toBe("A(B(content))");
  });

  it("middleware can annotate routes via meta", () => {
    const publicRoute = route({
      url: "/public",
      content: () => "public",
    });

    const protectedRoute = route({
      url: "/dashboard",
      content: () => "dashboard",
      meta: { auth: true },
    });

    const withLogging = ((currentRoute) => ({
      ...currentRoute,
      meta: { ...currentRoute.meta, logged: true },
    })) as RouteMiddleware;

    const [enhanced1, enhanced2] = applyMiddleware(
      [publicRoute, protectedRoute] as const,
      [withLogging],
    );

    expect(enhanced1.meta).toEqual({ logged: true });
    expect(enhanced2.meta).toEqual({ auth: true, logged: true });
  });

  it("returns the original route when no middleware is provided", () => {
    const baseRoute = route({
      url: "/demo",
      content: () => "content",
    });

    const [unchangedRoute] = applyMiddleware([baseRoute] as const, []);

    expect(unchangedRoute).toBe(baseRoute);
  });
});
