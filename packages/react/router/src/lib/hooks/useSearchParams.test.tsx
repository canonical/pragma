import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useSearchParams from "./useSearchParams.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
};

function AllSearchParamsProbe({
  renderCount,
}: {
  renderCount: { current: number };
}) {
  renderCount.current += 1;
  const searchParams = useSearchParams<typeof routes>();

  return <span>{searchParams.toString() || "none"}</span>;
}

function SelectedSearchParamsProbe({
  renderCount,
}: {
  renderCount: { current: number };
}) {
  renderCount.current += 1;
  const params = useSearchParams<typeof routes, undefined, ["page", "sort"]>([
    "page",
    "sort",
  ] as const);

  return <span>{`${params.page ?? "none"}:${params.sort ?? "none"}`}</span>;
}

describe("useSearchParams", () => {
  it("subscribes to the full query string when called without keys", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <AllSearchParamsProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(screen.getByText("none")).toBeTruthy();
    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/?page=2");
    });

    expect(screen.getByText("page=2")).toBeTruthy();
    expect(renderCount.current).toBe(2);
  });

  it("only re-renders when one of the selected keys changes", () => {
    const router = createRouter(routes);
    const renderCount = { current: 0 };

    render(
      <RouterProvider router={router}>
        <SelectedSearchParamsProbe renderCount={renderCount} />
      </RouterProvider>,
    );

    expect(screen.getByText("none:none")).toBeTruthy();
    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/?filter=active");
    });

    expect(renderCount.current).toBe(1);

    act(() => {
      router.store.setLocation("/?page=2&filter=active");
    });

    expect(screen.getByText("2:none")).toBeTruthy();
    expect(renderCount.current).toBe(2);

    act(() => {
      router.store.setLocation("/?page=2&sort=asc&filter=active");
    });

    expect(screen.getByText("2:asc")).toBeTruthy();
    expect(renderCount.current).toBe(3);
  });
});
