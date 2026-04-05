import { route } from "@canonical/router-core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  appRoutes,
  createHydratedAppRouter,
  createServerAppRouter,
  getAuthRedirectHref,
  hasDemoAuth,
  normalizeRequestHref,
  withAuth,
} from "./routes.js";

describe("app routes", () => {
  afterEach(() => {
    delete (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__;
    window.history.replaceState({}, "", "/");
  });

  it("renders the home route on the server router", async () => {
    const router = createServerAppRouter();
    const result = await router.load("/");

    render(<div>{router.render(result) as ReactNode}</div>);

    expect(
      screen.getByRole("heading", {
        name: "Canonical router integration demo",
      }),
    ).toBeInTheDocument();
  });

  it("redirects the protected route to login when auth is missing", async () => {
    const router = createServerAppRouter();
    const result = await router.load("/account");

    render(<div>{router.render(result) as ReactNode}</div>);

    expect(result.location.href).toBe("/login?from=%2Faccount");
    expect(
      screen.getByRole("heading", {
        name: "Sign in to the demo account",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("/account")).toBeInTheDocument();
  });

  it("loads the protected route when the demo auth token is present", async () => {
    const router = createServerAppRouter();
    const result = await router.load("/account?auth=1");

    render(<div>{router.render(result) as ReactNode}</div>);

    expect(result.location.href).toBe("/account?auth=1");
    expect(
      screen.getByRole("heading", {
        name: "Protected account workspace",
      }),
    ).toBeInTheDocument();
  });

  it("hydrates the current route from window.__INITIAL_DATA__", async () => {
    const serverRouter = createServerAppRouter();

    await serverRouter.load("/guides/router-core");

    (window as Window & { __INITIAL_DATA__?: unknown }).__INITIAL_DATA__ =
      serverRouter.dehydrate();
    window.history.replaceState({}, "", "/guides/router-core");

    const router = createHydratedAppRouter(window);

    render(<div>{router.render() as ReactNode}</div>);

    expect(
      screen.getByRole("heading", {
        name: "Guide: router-core",
      }),
    ).toBeInTheDocument();
  });

  it("renders the login page for direct visits and the not-found route for misses", async () => {
    const loginRouter = createServerAppRouter();
    const loginResult = await loginRouter.load("/login");

    render(<div>{loginRouter.render(loginResult) as ReactNode}</div>);

    expect(screen.getByText("direct visit")).toBeInTheDocument();

    const missingRouter = createServerAppRouter();
    const missingResult = await missingRouter.load("/missing");

    render(<div>{missingRouter.render(missingResult) as ReactNode}</div>);

    expect(
      screen.getByRole("heading", {
        name: "Page not found",
      }),
    ).toBeInTheDocument();
  });

  it("covers helper edge cases and middleware passthrough behavior", async () => {
    const middleware = withAuth("/login");
    const publicRoute = route({
      url: "/public",
      content: () => "public",
    });
    const bareProtectedRoute = route({
      url: "/account",
      content: () => "account",
    });
    const wrappedPublicRoute = middleware(publicRoute);
    const wrappedProtectedRoute = middleware(bareProtectedRoute);

    expect(wrappedPublicRoute).toBe(publicRoute);
    await expect(
      wrappedProtectedRoute.fetch?.(
        {},
        { auth: "1" },
        { signal: new AbortController().signal },
      ),
    ).resolves.toBeNull();
    await expect(
      wrappedProtectedRoute.fetch?.(
        undefined,
        {},
        { signal: new AbortController().signal },
      ),
    ).rejects.toMatchObject({
      status: 302,
      to: "/login?from=%2Faccount",
    });
    expect(hasDemoAuth({ auth: "1" })).toBe(true);
    expect(hasDemoAuth({ auth: "0" })).toBe(false);
    expect(getAuthRedirectHref("/account")).toBe("/login?from=%2Faccount");
    expect(getAuthRedirectHref("/account?auth=1")).toBeNull();
    expect(getAuthRedirectHref("/guides/router-core")).toBeNull();
    expect(
      getAuthRedirectHref(new URL("https://example.com/account?auth=1#top")),
    ).toBeNull();
    expect(
      normalizeRequestHref(new URL("https://example.com/account?auth=1#top")),
    ).toBe("/account?auth=1#top");
    expect(normalizeRequestHref("https://example.com/guides/router-core")).toBe(
      "/guides/router-core",
    );
    expect(appRoutes.guide.render({ slug: "router-core" })).toBe(
      "/guides/router-core",
    );
  });
});
