import type { AnyRoute, RouteMap, RouterStore } from "@canonical/router-core";
import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useNavigationState from "./useNavigationState.js";

function NavigationProbe() {
  const navigationState = useNavigationState<typeof routes>();

  return <span>{navigationState}</span>;
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

describe("useNavigationState", () => {
  it("tracks only the navigation state channel", () => {
    const router = createRouter(routes);

    render(
      <RouterProvider router={router}>
        <NavigationProbe />
      </RouterProvider>,
    );

    expect(screen.getByText("idle")).toBeTruthy();

    act(() => {
      getInternalStore(router).setNavigationState("loading");
    });

    expect(screen.getByText("loading")).toBeTruthy();
  });
});
