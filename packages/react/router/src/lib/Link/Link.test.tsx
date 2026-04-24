import {
  createMemoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Outlet from "../Outlet/Outlet.js";
import RouterProvider from "../RouterProvider/Provider.js";
import Link from "./Link.js";

const preloadSpy = vi.fn(async () => ({ default: "UsersPage" }));
const prefetchSpy = vi.fn(async () => {});

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
  users: route({
    url: "/users",
    prefetch: prefetchSpy,
    content: Object.assign(() => "users", {
      preload: preloadSpy,
    }),
  }),
};

describe("Link", () => {
  it("renders hrefs, prefetches on hover, and navigates on click", async () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Link<typeof routes> to="users">Users</Link>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("home")).toBeTruthy();
    });

    const link = screen.getByRole("link", { name: "Users" });

    expect(link.getAttribute("href")).toBe("/users");

    fireEvent.mouseEnter(link);

    await waitFor(() => {
      expect(preloadSpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(link);

    await waitFor(() => {
      expect(screen.getByText("users")).toBeTruthy();
    });

    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it("preserves default browser behavior for modified clicks", () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Link<typeof routes> to="users">Users</Link>
      </RouterProvider>,
    );

    const link = screen.getByRole("link", { name: "Users" });

    fireEvent.click(link, { metaKey: true });

    expect(router.getState().location.href).toBe("/");
  });

  it("does not intercept clicks with altKey, ctrlKey, or shiftKey modifiers", () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Link<typeof routes> to="users">Users</Link>
      </RouterProvider>,
    );

    const link = screen.getByRole("link", { name: "Users" });

    for (const modifier of ["altKey", "ctrlKey", "shiftKey"] as const) {
      fireEvent.click(link, { [modifier]: true });
      expect(router.getState().location.href).toBe("/");
    }
  });

  it("does not intercept clicks when target is _blank", () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Link<typeof routes> target="_blank" to="users">
          Users
        </Link>
      </RouterProvider>,
    );

    const link = screen.getByRole("link", { name: "Users" });

    fireEvent.click(link);

    expect(router.getState().location.href).toBe("/");
  });

  it("passes params, search, and hash to navigation helpers and skips prevented hovers", async () => {
    const optionPreloadSpy = vi.fn(async () => ({ default: "UserPage" }));
    const optionPrefetchSpy = vi.fn(async () => {});
    const parameterizedRoutes = {
      user: route({
        url: "/users/:id",
        prefetch: optionPrefetchSpy,
        content: Object.assign(
          ({ params }: { params: { id: string } }) => `user:${params.id}`,
          {
            preload: optionPreloadSpy,
          },
        ),
      }),
    };
    const router = createRouter(parameterizedRoutes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Link<typeof parameterizedRoutes>
          onMouseEnter={(event) => {
            event.preventDefault();
          }}
          params={{ id: "42" }}
          to="user"
        >
          Prevented user
        </Link>
        <Link<typeof parameterizedRoutes>
          hash="details"
          params={{ id: "42" }}
          to="user"
        >
          User
        </Link>
      </RouterProvider>,
    );

    const preventedLink = screen.getByRole("link", { name: "Prevented user" });
    const link = screen.getByRole("link", { name: "User" });

    expect(link.getAttribute("href")).toBe("/users/42#details");

    fireEvent.mouseEnter(preventedLink);

    await waitFor(() => {
      expect(optionPreloadSpy).toHaveBeenCalledTimes(0);
    });

    fireEvent.click(link);

    await waitFor(() => {
      expect(router.getState().location.pathname).toBe("/users/42");
      expect(router.getState().location.hash).toBe("#details");
      expect(router.getState().location.searchParams.toString()).toBe("");
    });

    expect(optionPreloadSpy).toHaveBeenCalledTimes(1);

    const preloadCallCount = optionPreloadSpy.mock.calls.length;

    fireEvent.mouseEnter(link);

    await waitFor(() => {
      expect(optionPreloadSpy).toHaveBeenCalledTimes(preloadCallCount);
    });
  });
});
