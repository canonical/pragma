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
        data: undefined,
      }),
    ).toBe("A(B(content))");
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
