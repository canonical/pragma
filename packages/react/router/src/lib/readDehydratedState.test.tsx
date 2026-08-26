import {
  createHistoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Outlet from "./Outlet/Outlet.js";
import RouterProvider from "./RouterProvider/Provider.js";
import readDehydratedState from "./readDehydratedState.js";

const routes = {
  page: route({
    url: "/pages/:slug",
    warm: vi.fn(async ({ slug }: { slug: string }) => {
      void slug;
    }),
    content: ({ params }) => `page:${params.slug}`,
  }),
};

describe("readDehydratedState", () => {
  afterEach(() => {
    delete (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__;
    window.history.replaceState({}, "", "/");
  });

  it("hydrates a router from dehydrated state carried in the window payload", async () => {
    const serverRouter = createRouter(routes);

    await serverRouter.load("/pages/hello");

    (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__ = {
      ...serverRouter.dehydrate(),
      theme: "light",
    };
    window.history.replaceState({}, "", "/pages/hello");

    const router = createRouter(routes, {
      adapter: createHistoryAdapter(),
      hydratedState: readDehydratedState() ?? undefined,
    });

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

  it("returns null when no payload is present", () => {
    expect(readDehydratedState()).toBeNull();
  });

  it("returns null when the payload carries no dehydrated router fields", () => {
    (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__ = {
      url: "/pages/hello",
      theme: "dark",
    };

    expect(readDehydratedState()).toBeNull();
  });
});
