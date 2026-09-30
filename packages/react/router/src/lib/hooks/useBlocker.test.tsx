import {
  createMemoryAdapter,
  createRouter,
  route,
} from "@canonical/router-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useBlocker from "./useBlocker.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
  about: route({
    url: "/about",
    content: () => "about",
  }),
};

function BlockerProbe({ isActive }: { isActive: boolean }) {
  const blocker = useBlocker(isActive);

  return (
    <div>
      <span data-testid="state">{blocker.state}</span>
      <button type="button" onClick={blocker.proceed}>
        proceed
      </button>
      <button type="button" onClick={blocker.cancel}>
        cancel
      </button>
    </div>
  );
}

describe("useBlocker", () => {
  it("reports the idle blocker state while navigation is unblocked", () => {
    const router = createRouter(routes, { adapter: createMemoryAdapter("/") });

    render(
      <RouterProvider router={router}>
        <BlockerProbe isActive={false} />
      </RouterProvider>,
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("re-renders to blocked as soon as a navigation is intercepted", async () => {
    const router = createRouter(routes, { adapter: createMemoryAdapter("/") });

    await act(async () => {
      await router.load("/");
    });

    render(
      <RouterProvider router={router}>
        <BlockerProbe isActive={true} />
      </RouterProvider>,
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");

    act(() => {
      router.navigate("about");
    });

    // The block itself triggers the re-render — no unrelated store change
    // is needed to flush the snapshot.
    expect(screen.getByTestId("state").textContent).toBe("blocked");
  });

  it("renders the documented confirmation-dialog pattern when blocked", async () => {
    function DialogProbe() {
      const blocker = useBlocker(true);

      return (
        <div>
          {blocker.state === "blocked" && (
            <div role="dialog">
              <button type="button" onClick={blocker.proceed}>
                Leave
              </button>
              <button type="button" onClick={blocker.cancel}>
                Stay
              </button>
            </div>
          )}
        </div>
      );
    }

    const router = createRouter(routes, { adapter: createMemoryAdapter("/") });

    await act(async () => {
      await router.load("/");
    });

    render(
      <RouterProvider router={router}>
        <DialogProbe />
      </RouterProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => {
      router.navigate("about");
    });

    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => {
      screen.getByText("Leave").click();
    });

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("proceeds through the pending navigation when proceed is called", async () => {
    const router = createRouter(routes, { adapter: createMemoryAdapter("/") });

    await act(async () => {
      await router.load("/");
    });

    render(
      <RouterProvider router={router}>
        <BlockerProbe isActive={true} />
      </RouterProvider>,
    );

    act(() => {
      router.navigate("about");
    });

    expect(screen.getByTestId("state").textContent).toBe("blocked");

    await act(async () => {
      screen.getByText("proceed").click();
    });

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });

    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("cancels the pending navigation and stays on the current page when cancel is called", async () => {
    const router = createRouter(routes, { adapter: createMemoryAdapter("/") });

    await act(async () => {
      await router.load("/");
    });

    render(
      <RouterProvider router={router}>
        <BlockerProbe isActive={true} />
      </RouterProvider>,
    );

    act(() => {
      router.navigate("about");
    });

    expect(screen.getByTestId("state").textContent).toBe("blocked");

    act(() => {
      screen.getByText("cancel").click();
    });

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(router.getState().location.pathname).toBe("/");
  });

  it("unregisters the blocker when the component unmounts", async () => {
    const router = createRouter(routes, { adapter: createMemoryAdapter("/") });

    await act(async () => {
      await router.load("/");
    });

    const { unmount } = render(
      <RouterProvider router={router}>
        <BlockerProbe isActive={true} />
      </RouterProvider>,
    );

    unmount();

    act(() => {
      router.navigate("about");
    });

    await vi.waitFor(() => {
      expect(router.getState().location.pathname).toBe("/about");
    });
  });
});
