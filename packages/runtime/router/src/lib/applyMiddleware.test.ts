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

  it("rebuilds parse and render from the transformed url pattern", () => {
    const baseRoute = route({
      url: "/users/:id",
      content: () => "user",
    });

    // Middleware that prefixes the URL
    const prefixer = ((currentRoute: typeof baseRoute) => {
      return {
        ...currentRoute,
        url: `/api${currentRoute.url}`,
      };
    }) as RouteMiddleware;

    const [enhanced] = applyMiddleware([baseRoute] as const, [prefixer]);

    // parse should use the new URL pattern
    expect(enhanced.parse("/api/users/42")).toEqual({ id: "42" });
    expect(enhanced.parse("/users/42")).toBeNull();

    // render should use the new URL pattern
    expect(enhanced.render({ id: "42" })).toBe("/api/users/42");
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
