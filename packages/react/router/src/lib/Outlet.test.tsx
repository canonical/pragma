import {
  createMemoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Outlet from "./Outlet.js";
import RouterProvider from "./RouterProvider.js";

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
});
