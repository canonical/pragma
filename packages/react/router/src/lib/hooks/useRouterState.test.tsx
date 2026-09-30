import type { AnyRoute, RouteMap, RouterStore } from "@canonical/router-core";
import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useRouterState from "./useRouterState.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
  users: route({
    url: "/users",
    content: () => "users",
  }),
};

function FullStateProbe() {
  const state = useRouterState<typeof routes>();

  return <span>{state.location.pathname}</span>;
}

function PathnameProbe({ renderCount }: { renderCount: { current: number } }) {
  renderCount.current += 1;
  const pathname = useRouterState<typeof routes, undefined, string>(
    (state) => state.location.pathname,
  );

  return <span>{pathname}</span>;
}

function StableObjectProbe({
  renderCount,
}: {
  renderCount: { current: number };
}) {
  renderCount.current += 1;
  const selection = useRouterState<
    typeof routes,
    undefined,
    { readonly pathname: string }
  >(
    (state) => ({
      pathname: state.location.pathname,
    }),
    {
      isEqual: (previous, next) => previous.pathname === next.pathname,
    },
  );

  return <span>{selection.pathname}</span>;
}

/**
 * Reach the router's internal store — not part of the public Router
 * contract, kept reachable on the concrete object for these tests.
 */
function getInternalStore(router: unknown): RouterStore<RouteMap, AnyRoute> {
  return (router as { store: RouterStore<RouteMap, AnyRoute> }).store;
}

describe("useRouterState", () => {
  it("returns the full router state when no selector is provided", () => {
    const router = createRouter(routes);

    render(
      <RouterProvider router={router}>
        <FullStateProbe />
      </RouterProvider>,
    );

    expect(screen.getByText("/")).toBeTruthy();
  });

  it("re-renders only when the selected primitive slice changes", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <PathnameProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(renderCount.current).toBe(1);

    act(() => {
      getInternalStore(router).setLocation("/#details");
    });

    expect(renderCount.current).toBe(1);

    act(() => {
      getInternalStore(router).setLocation("/users");
    });

    expect(screen.getByText("/users")).toBeTruthy();
    expect(renderCount.current).toBe(2);
  });

  it("supports semantic equality for structured selections", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <StableObjectProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(renderCount.current).toBe(1);

    act(() => {
      getInternalStore(router).setLocation("/?tab=activity");
    });

    expect(renderCount.current).toBe(1);

    act(() => {
      getInternalStore(router).setLocation("/users?tab=activity");
    });

    expect(screen.getByText("/users")).toBeTruthy();
    expect(renderCount.current).toBe(2);
  });
});
