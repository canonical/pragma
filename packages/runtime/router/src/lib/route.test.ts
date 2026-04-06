import { describe, expect, it } from "vitest";
import route from "./route.js";
import wrapper from "./wrapper.js";

describe("route", () => {
  it("round-trips params through render and parse", () => {
    const userRoute = route({
      url: "/users/:userId/posts/:postId",
      content: ({ params }) => `${params.userId}:${params.postId}`,
    });

    const renderedPath = userRoute.render({ userId: "42", postId: "99" });

    expect(renderedPath).toBe("/users/42/posts/99");
    expect(userRoute.parse(renderedPath)).toEqual({
      userId: "42",
      postId: "99",
    });
  });

  it("returns null when a pathname does not match", () => {
    const userRoute = route({
      url: "/users/:userId",
      content: ({ params }) => params.userId,
    });

    expect(userRoute.parse("/settings")).toBeNull();
    expect(userRoute.parse("/posts/42")).toBeNull();
  });

  it("parses both URL instances and absolute URL strings", () => {
    const userRoute = route({
      url: "/users/:userId",
      content: ({ params }) => params.userId,
    });

    expect(userRoute.parse(new URL("https://example.com/users/42"))).toEqual({
      userId: "42",
    });
    expect(userRoute.parse("https://example.com/users/encoded%20name")).toEqual(
      {
        userId: "encoded name",
      },
    );
  });

  it("supports root routes and throws when a required param is missing", () => {
    const homeRoute = route({
      url: "/",
      content: () => "home",
    });

    const userRoute = route({
      url: "/users/:userId",
      content: ({ params }) => params.userId,
    });

    expect(homeRoute.parse("/")).toEqual({});
    expect(() => {
      userRoute.render({} as never);
    }).toThrow("Missing route param 'userId' for '/users/:userId'.");
  });

  it("constructs static redirect routes", () => {
    const legacyLayout = wrapper({
      id: "legacy:layout",
      component: ({ children }) => children,
    });

    const legacyRoute = route({
      url: "/old-blog/:slug",
      redirect: "/articles/:slug",
      status: 301,
      wrappers: [legacyLayout] as const,
    });

    expect(legacyRoute.redirect).toBe("/articles/:slug");
    expect(legacyRoute.status).toBe(301);
    expect(legacyRoute.wrappers).toEqual([legacyLayout]);
    expect(legacyRoute.parse("/old-blog/intro")).toEqual({ slug: "intro" });
    expect(legacyRoute.render({ slug: "intro" })).toBe("/old-blog/intro");
  });

  it("defaults redirect route wrappers to an empty list", () => {
    const legacyRoute = route({
      url: "/legacy",
      redirect: "/modern",
      status: 308,
    });

    expect(legacyRoute.wrappers).toEqual([]);
  });
});
