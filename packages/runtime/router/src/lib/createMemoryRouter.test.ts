import { describe, expect, it, vi } from "vitest";
import createMemoryRouter from "./createMemoryRouter.js";
import route from "./route.js";

describe("createMemoryRouter", () => {
  it("creates a router with an in-memory adapter at the given URL", async () => {
    const router = createMemoryRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      "/about",
    );

    await router.load("/about");

    expect(router.getState().location.pathname).toBe("/about");
  });

  it("defaults to / when no URL is provided", async () => {
    const router = createMemoryRouter({
      home: route({ url: "/", content: () => "home" }),
    });

    await router.load("/");

    expect(router.getState().location.pathname).toBe("/");
  });

  it("supports navigation between routes", async () => {
    const router = createMemoryRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      "/",
    );

    await router.load("/");
    router.navigate("about");

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });
  });
});
