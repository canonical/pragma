import { createRouter, route } from "@canonical/router-core";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import createHydratedRouter from "./createHydratedRouter.js";
import Outlet from "./Outlet/Outlet.js";
import RouterProvider from "./RouterProvider/Provider.js";

const routes = {
  page: route({
    url: "/pages/:slug",
    prefetch: vi.fn(async ({ slug }: { slug: string }) => {
      void slug;
    }),
    content: ({ params }) => `page:${params.slug}`,
  }),
};

describe("createHydratedRouter", () => {
  afterEach(() => {
    delete (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__;
    window.history.replaceState({}, "", "/");
  });

  it("creates a browser-backed router and hydrates initial state from the window", async () => {
    const serverRouter = createRouter(routes);

    await serverRouter.load("/pages/hello");

    (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__ =
      serverRouter.dehydrate();
    window.history.replaceState({}, "", "/pages/hello");

    const router = createHydratedRouter(routes);

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("page:hello")).toBeTruthy();
    });

    expect(router.getState().match?.kind).toBe("route");
  });

  it("returns a browser-backed router when no initial data is present", () => {
    const router = createHydratedRouter(routes);

    expect(router.adapter).not.toBeNull();
    expect(router.getState().location.pathname).toBe("/");
  });
});
