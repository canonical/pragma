import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useSearchParam from "./useSearchParam.js";

function SearchProbe() {
  const page = useSearchParam<typeof routes>("page");

  return <span>{page ?? "none"}</span>;
}

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
};

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
      router.store.setLocation("/?sort=asc");
    });

    expect(screen.getByText("none")).toBeTruthy();

    act(() => {
      router.store.setLocation("/?page=2&sort=asc");
    });

    expect(screen.getByText("2")).toBeTruthy();
  });
});
