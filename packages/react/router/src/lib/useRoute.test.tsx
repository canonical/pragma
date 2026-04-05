import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "./RouterProvider.js";
import useRoute from "./useRoute.js";

function PathnameProbe({ renderCount }: { renderCount: { current: number } }) {
  renderCount.current += 1;
  const location = useRoute<typeof routes>();

  return <span>{location.pathname}</span>;
}

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

function QueryProbe({ renderCount }: { renderCount: { current: number } }) {
  renderCount.current += 1;
  const location = useRoute<typeof routes>();

  Reflect.get(location as object, Symbol.toStringTag);

  return (
    <span>
      {location.url.href}:{location.searchParams.get("tab") ?? "none"}
    </span>
  );
}

function SearchProbe({ renderCount }: { renderCount: { current: number } }) {
  renderCount.current += 1;
  const location = useRoute<typeof routes>();

  return <span>{location.searchParams.get("tab") ?? "none"}</span>;
}

describe("useRoute", () => {
  it("only re-renders when an accessed location key changes", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <PathnameProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(screen.getByText("/")).toBeTruthy();
    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/#details");
    });

    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/users");
    });

    expect(screen.getByText("/users")).toBeTruthy();
    expect(renderCount.current).toBe(2);
  });

  it("tracks url and searchParams changes", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <QueryProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(screen.getByText("https://router.local/:none")).toBeTruthy();
    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/?tab=details");
    });

    expect(
      screen.getByText("https://router.local/?tab=details:details"),
    ).toBeTruthy();
    expect(renderCount.current).toBe(2);

    act(() => {
      router.store.setLocation("/?tab=details#hash");
    });

    expect(
      screen.getByText("https://router.local/?tab=details#hash:details"),
    ).toBeTruthy();
    expect(renderCount.current).toBe(3);
  });

  it("re-renders when no tracked property is read", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    function ProbeWithoutReads() {
      renderCount.current += 1;
      useRoute<typeof routes>();

      return <span>idle</span>;
    }

    render(
      <RouterProvider router={router}>
        <ProbeWithoutReads />
      </RouterProvider>,
    );

    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/users");
    });

    expect(renderCount.current).toBe(2);
  });

  it("tracks searchParams when they are accessed directly", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <SearchProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(screen.getByText("none")).toBeTruthy();
    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/?tab=activity");
    });

    expect(screen.getByText("activity")).toBeTruthy();
    expect(renderCount.current).toBe(2);
  });
});
