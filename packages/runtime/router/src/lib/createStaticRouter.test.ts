import { describe, expect, it } from "vitest";
import createStaticRouter from "./createStaticRouter.js";
import route from "./route.js";

describe("createStaticRouter", () => {
  it("matches the URL on construction and exposes the match result", () => {
    const router = createStaticRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      "/about",
    );

    expect(router.match).not.toBeNull();
    expect(router.match?.kind).toBe("route");
    expect(router.match?.name).toBe("about");
  });

  it("returns null match for unmatched URLs", () => {
    const router = createStaticRouter(
      {
        home: route({ url: "/", content: () => "home" }),
      },
      "/unknown",
    );

    expect(router.match).toBeNull();
  });

  it("detects redirect routes", () => {
    const router = createStaticRouter(
      {
        old: route({ url: "/old", redirect: "/new", status: 301 }),
        new: route({ url: "/new", content: () => "new" }),
      },
      "/old",
    );

    expect(router.match?.kind).toBe("redirect");

    if (router.match?.kind === "redirect") {
      expect(router.match.redirectTo).toBe("/new");
      expect(router.match.status).toBe(301);
    }
  });

  it("supports not-found route", () => {
    const notFound = route({ url: "/not-found", content: () => "404" });

    const router = createStaticRouter(
      {
        home: route({ url: "/", content: () => "home" }),
      },
      "/unknown",
      { notFound },
    );

    expect(router.match?.kind).toBe("not-found");
  });

  it("accepts a URL object instead of a string", () => {
    const router = createStaticRouter(
      {
        about: route({ url: "/about", content: () => "about" }),
      },
      new URL("https://example.com/about"),
    );

    expect(router.match).not.toBeNull();
    expect(router.match?.kind).toBe("route");
    expect(router.match?.name).toBe("about");
  });

  it("does not support client-side navigation", () => {
    const router = createStaticRouter(
      {
        home: route({ url: "/", content: () => "home" }),
      },
      "/",
    );

    expect(() => {
      router.navigate("home");
    }).toThrow();
  });
});
