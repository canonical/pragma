import {
  createMemoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import Outlet from "./Outlet.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
  lazy: route({
    url: "/lazy",
    content: () => {
      return <span>lazy</span>;
    },
  }),
};

describe("Outlet", () => {
  it("renders the current route output and wraps it in Suspense", async () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet fallback={<span>loading</span>} />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("home")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("lazy");
    });

    await waitFor(() => {
      expect(screen.getByText("lazy")).toBeTruthy();
    });
  });

  it("renders the not-found route when the URL is unmatched", async () => {
    const notFoundRoute = route({
      url: "/404",
      content: () => <span>not found</span>,
    });

    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/unknown"),
      notFound: notFoundRoute,
    });

    await router.load("/unknown");

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("not found")).toBeTruthy();
    });
  });

  it("renders nothing when no route has been loaded", () => {
    const emptyRoutes = {
      page: route({
        url: "/page",
        content: () => <span>page</span>,
      }),
    };

    const router = createRouter(emptyRoutes, {
      adapter: createMemoryAdapter("/unmatched"),
    });

    const { container } = render(
      <RouterProvider router={router}>
        <Outlet fallback={<span>loading</span>} />
      </RouterProvider>,
    );

    // No load has been called and the URL doesn't match, so Outlet is empty.
    expect(screen.queryByText("page")).toBeNull();
    expect(container).toBeTruthy();
  });
});
