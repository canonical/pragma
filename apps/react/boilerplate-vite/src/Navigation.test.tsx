import { createMemoryAdapter, createRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Navigation from "./Navigation.js";
import { appRoutes, withAuth } from "./routes.js";

describe("Navigation", () => {
  it("renders typed links and prefetches the guide route on hover", async () => {
    const router = createRouter(appRoutes, {
      adapter: createMemoryAdapter("/"),
      middleware: [withAuth("/login")],
    });
    const prefetchSpy = vi.spyOn(router, "prefetch");

    render(
      <RouterProvider router={router}>
        <Navigation />
      </RouterProvider>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute(
      "href",
      "/guides/router-core",
    );
    expect(
      screen.getByRole("link", { name: "Protected account" }),
    ).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Demo sign-in" })).toHaveAttribute(
      "href",
      "/account?auth=1",
    );

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Guide" }));

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalledWith("guide", {
        params: { slug: "router-core" },
      });
    });
  });
});
