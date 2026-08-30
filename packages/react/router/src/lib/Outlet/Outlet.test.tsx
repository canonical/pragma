import type { WrapperComponentProps } from "@canonical/router-core";
import {
  createMemoryAdapter,
  createRouter,
  route,
  wrapper,
} from "@canonical/router-core";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createElement, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import Outlet from "./Outlet.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
  lazy: route({
    url: "/lazy",
    content: () => {
      return <span>lazy</span>;
    },
  }),
};

describe("Outlet", () => {
  it("renders the current route output and wraps it in Suspense", async () => {
    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet fallback={<span>loading</span>} />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("home")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("lazy");
    });

    await waitFor(() => {
      expect(screen.getByText("lazy")).toBeTruthy();
    });
  });

  it("renders the not-found route when the URL is unmatched", async () => {
    const notFoundRoute = route({
      url: "/404",
      content: () => <span>not found</span>,
    });

    const router = createRouter(routes, {
      adapter: createMemoryAdapter("/unknown"),
      notFound: notFoundRoute,
    });

    await router.load("/unknown");

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("not found")).toBeTruthy();
    });
  });

  it("renders nothing when no route has been loaded", () => {
    const emptyRoutes = {
      page: route({
        url: "/page",
        content: () => <span>page</span>,
      }),
    };

    const router = createRouter(emptyRoutes, {
      adapter: createMemoryAdapter("/unmatched"),
    });

    const { container } = render(
      <RouterProvider router={router}>
        <Outlet fallback={<span>loading</span>} />
      </RouterProvider>,
    );

    // No load has been called and the URL doesn't match, so Outlet is empty.
    expect(screen.queryByText("page")).toBeNull();
    expect(container).toBeTruthy();
  });
});

describe("Outlet hook ownership (AV-340)", () => {
  // Bare function components with intentionally different hook counts. Route
  // content and wrapper components must each get their own fiber; hooks they
  // call must never attach to Outlet's fiber.
  let manyHooksMounts = 0;

  function ManyHooksPage(): ReactElement {
    const [label] = useState(() => {
      manyHooksMounts += 1;

      return `many-hooks-mount-${manyHooksMounts}`;
    });
    const renderCount = useRef(0);

    useEffect(() => {
      // Present purely to give this component a third hook.
    }, []);

    renderCount.current += 1;

    return <span>{label}</span>;
  }

  function FewHooksPage(): ReactElement {
    const [label] = useState("few-hooks");

    return <span>{label}</span>;
  }

  const hookRoutes = {
    many: route({ url: "/", content: ManyHooksPage }),
    few: route({ url: "/few", content: FewHooksPage }),
  };

  let hadActFlag: boolean;
  let previousActFlag: unknown;

  beforeEach(() => {
    manyHooksMounts = 0;

    const actGlobal = globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown };

    hadActFlag = "IS_REACT_ACT_ENVIRONMENT" in actGlobal;
    previousActFlag = actGlobal.IS_REACT_ACT_ENVIRONMENT;
    actGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    const actGlobal = globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown };

    if (hadActFlag) {
      actGlobal.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
    } else {
      delete actGlobal.IS_REACT_ACT_ENVIRONMENT;
    }
  });

  it("navigates between bare-component routes with different hook counts", async () => {
    const router = createRouter(hookRoutes, {
      adapter: createMemoryAdapter("/"),
    });
    // A raw root with an `onUncaughtError` spy: React 19 reports uncaught
    // render errors (such as "Rendered fewer hooks than expected") there
    // instead of rethrowing, so a console/error-boundary-free assertion needs
    // the root option.
    const onUncaughtError = vi.fn();
    const container = document.createElement("div");

    document.body.appendChild(container);

    const root = createRoot(container, { onUncaughtError });

    await act(async () => {
      root.render(
        <RouterProvider router={router}>
          <Outlet />
        </RouterProvider>,
      );
    });

    await waitFor(() => {
      expect(container.textContent).toContain("many-hooks-mount-1");
    });

    // More hooks -> fewer hooks: the direction React 19 throws on.
    await act(async () => {
      await router.navigate("few");
    });

    expect(onUncaughtError.mock.calls.map((call) => String(call[0]))).toEqual(
      [],
    );
    expect(container.textContent).toContain("few-hooks");

    // And back: fewer -> more.
    await act(async () => {
      await router.navigate("many");
    });

    expect(onUncaughtError.mock.calls.map((call) => String(call[0]))).toEqual(
      [],
    );
    expect(container.textContent).toContain("many-hooks");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("supports hooks in wrapper components across navigation", async () => {
    function StatefulShell({
      children,
    }: WrapperComponentProps<ReactNode>): ReactElement {
      const [shellId] = useState("stateful-shell");

      return <div data-testid={shellId}>{children}</div>;
    }

    const shell = wrapper<ReactNode>({
      id: "shell",
      component: StatefulShell,
    });
    const wrappedRoutes = {
      many: route({
        url: "/",
        content: ManyHooksPage,
        wrappers: [shell] as const,
      }),
      few: route({
        url: "/few",
        content: FewHooksPage,
        wrappers: [shell] as const,
      }),
    };
    const router = createRouter(wrappedRoutes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("stateful-shell")).toBeTruthy();
      expect(screen.getByText("many-hooks-mount-1")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("few");
    });

    await waitFor(() => {
      expect(screen.getByTestId("stateful-shell")).toBeTruthy();
      expect(screen.getByText("few-hooks")).toBeTruthy();
    });
  });

  it("renders element-creating arrow content identically to bare components", async () => {
    function GreetingPage({
      params,
    }: {
      readonly params: { readonly name: string };
    }): ReactElement {
      return <span>hello-{params.name}</span>;
    }

    const mixedRoutes = {
      bare: route({ url: "/bare/:name", content: GreetingPage }),
      arrow: route({
        url: "/arrow/:name",
        content: (props) =>
          createElement(GreetingPage, { params: props.params }),
      }),
    };
    const router = createRouter(mixedRoutes, {
      adapter: createMemoryAdapter("/bare/world"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("hello-world")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("arrow", { params: { name: "world" } });
    });

    await waitFor(() => {
      expect(screen.getByText("hello-world")).toBeTruthy();
    });
  });

  it("remounts route content with fresh hook state when navigating away and back", async () => {
    const router = createRouter(hookRoutes, {
      adapter: createMemoryAdapter("/"),
    });

    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("many-hooks-mount-1")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("few");
    });

    await waitFor(() => {
      expect(screen.getByText("few-hooks")).toBeTruthy();
    });

    await act(async () => {
      await router.navigate("many");
    });

    // The rendered content is keyed by route name, so returning to the route
    // remounts its content with fresh hook state (a second useState
    // initializer run), rather than reusing the previous state.
    await waitFor(() => {
      expect(screen.getByText("many-hooks-mount-2")).toBeTruthy();
    });
  });
});
