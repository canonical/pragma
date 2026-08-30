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

  it("forwards the history delegate to the memory adapter", async () => {
    const listeners = new Set<(location: string | URL) => void>();
    let current = "/about";
    const onNavigate = vi.fn((url: string) => {
      current = url;

      for (const listener of listeners) {
        listener(current);
      }
    });
    const router = createMemoryRouter(
      {
        home: route({ url: "/", content: () => "home" }),
        about: route({ url: "/about", content: () => "about" }),
      },
      "/ignored-when-delegated",
      {
        history: {
          getLocation: () => current,
          onNavigate,
          subscribe: (listener) => {
            listeners.add(listener);

            return () => {
              listeners.delete(listener);
            };
          },
        },
      },
    );

    // The initial load reads the delegate, not the initialUrl argument.
    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });

    router.navigate("home");

    await vi.waitFor(() => {
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(router.getState().location.pathname).toBe("/");
    });
  });
});
