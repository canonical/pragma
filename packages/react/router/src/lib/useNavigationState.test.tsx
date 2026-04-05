import { createRouter, route } from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "./RouterProvider.js";
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
      router.store.setNavigationState("loading");
    });

    expect(screen.getByText("loading")).toBeTruthy();
  });
});
