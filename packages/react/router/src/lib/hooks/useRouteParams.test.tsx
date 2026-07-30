import {
  createMemoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import Outlet from "../Outlet/Outlet.js";
import RouterProvider from "../RouterProvider/Provider.js";
import useRouteParams from "./useRouteParams.js";

const userRoute = route({
  url: "/users/:userId",
  component: UserPage,
});

const routes = {
  home: route({ url: "/", component: () => <span>home</span> }),
  user: userRoute,
};

function UserPage(): ReactElement {
  // `params.userId` is typed as string, inferred from the route's url.
  const params = useRouteParams(userRoute);

  return <span>user-{params.userId}</span>;
}

describe("useRouteParams", () => {
  it("returns the current match's params and updates across navigation", async () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/users/1"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("user-1")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("user", { params: { userId: "2" } });
    });

    await waitFor(() => {
      expect(screen.getByText("user-2")).toBeTruthy();
    });
  });

  it("returns an empty object when nothing is matched", () => {
    function Probe(): ReactElement {
      const params = useRouteParams(userRoute);

      return <span>keys-{Object.keys(params).length}</span>;
    }

    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/no-such-url"),
    });

    render(
      <RouterProvider router={router}>
        <Probe />
      </RouterProvider>,
    );

    expect(screen.getByText("keys-0")).toBeTruthy();
  });
});
