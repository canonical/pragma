import type { AnyRoute, RouteMap, RouterStore } from "@canonical/router-core";
import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useSearchParam from "./useSearchParam.js";

function SearchProbe() {
  const page = useSearchParam("page");

  return <span>{page ?? "none"}</span>;
}

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
};

/**
 * Reach the router's internal store — not part of the public Router
 * contract, kept reachable on the concrete object for these tests.
 */
function getInternalStore(router: unknown): RouterStore<RouteMap, AnyRoute> {
  return (router as { store: RouterStore<RouteMap, AnyRoute> }).store;
}

describe("useSearchParam", () => {
  it("subscribes to a single search param key", () => {
    const router = createRouter(routes);

    render(
      <RouterProvider router={router}>
        <SearchProbe />
      </RouterProvider>,
    );

    expect(screen.getByText("none")).toBeTruthy();

    act(() => {
      getInternalStore(router).setLocation("/?sort=asc");
    });

    expect(screen.getByText("none")).toBeTruthy();

    act(() => {
      getInternalStore(router).setLocation("/?page=2&sort=asc");
    });

    expect(screen.getByText("2")).toBeTruthy();
  });
});
