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
import useRouteSearch from "./useRouteSearch.js";

const listSearchSchema = {
  "~standard": {
    output: {} as { readonly page: number },
    validate(value: unknown) {
      const raw = value as { page?: string };
      const page = Number(raw.page ?? "1");

      return Number.isInteger(page) && page >= 1
        ? { value: { page } }
        : { issues: [{ message: "page must be a positive integer" }] };
    },
  },
};

const listRoute = route({
  url: "/list",
  search: listSearchSchema,
  component: ListPage,
});

const routes = {
  home: route({ url: "/", component: () => <span>home</span> }),
  list: listRoute,
};

function ListPage(): ReactElement {
  // `search.page` is typed as number, inferred from the route's schema.
  const search = useRouteSearch(listRoute);

  return <span>page-{search.page}</span>;
}

describe("useRouteSearch", () => {
  it("returns the schema-validated search data and updates across navigation", async () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/list?page=2"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("page-2")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("list", { search: { page: 5 } });
    });

    await waitFor(() => {
      expect(screen.getByText("page-5")).toBeTruthy();
    });
  });

  it("returns an empty object when nothing is matched", () => {
    function Probe(): ReactElement {
      const search = useRouteSearch(listRoute);

      return <span>keys-{Object.keys(search).length}</span>;
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
