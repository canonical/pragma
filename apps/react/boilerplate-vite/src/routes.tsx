import {
  type AnyRoute,
  createBrowserRouter,
  createStaticRouter,
  group,
  type NavigationContext,
  type RouteMiddleware,
  type RouteParamValues,
  redirect,
  route,
  wrapper,
} from "@canonical/router-core";
import type { ReactElement, ReactNode } from "react";
import accountRoutes from "#domains/account/routes.js";
import marketingRoutes from "#domains/marketing/routes.js";
import Navigation from "#lib/Navigation/index.js";

const protectedPaths = new Set(["/account"]);

function hasDemoAuth(search: unknown): boolean {
  const authValue = (search as Record<string, unknown>)?.auth;

  return authValue === "1";
}

export function getAuthRedirectHref(input: string | URL): string | null {
  const url =
    input instanceof URL
      ? input
      : new URL(
          input.startsWith("http") ? input : input,
          "https://router.local",
        );

  if (
    !protectedPaths.has(url.pathname) ||
    hasDemoAuth({ auth: url.searchParams.get("auth") })
  ) {
    return null;
  }

  return `/login?from=${encodeURIComponent(url.pathname)}`;
}

export function withAuth(loginPath: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;
    }

    const currentPrefetch = currentRoute.prefetch;

    return {
      ...currentRoute,
      prefetch: (
        params: unknown,
        search: unknown,
        context: NavigationContext,
      ) => {
        if (!hasDemoAuth(search)) {
          const from = currentRoute.render(
            (params ?? {}) as RouteParamValues | Record<string, never>,
          );

          redirect(`${loginPath}?from=${encodeURIComponent(from)}`, 302);
        }

        if (currentPrefetch) {
          return currentPrefetch(params, search, context);
        }
      },
    };
  }) as RouteMiddleware;
}

const publicLayout = wrapper<ReactElement>({
  id: "public-layout",
  component: ({ children }: { children: ReactNode }) => (
    <div className="grid responsive app-shell">
      <header className="subgrid shell-header">
        <Navigation />
      </header>
      <main className="subgrid">{children}</main>
    </div>
  ),
});

const notFoundRoute = route({
  url: "/not-found",
  content: () => (
    <section>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
    </section>
  ),
});

const [guide, home] = group(publicLayout, [
  marketingRoutes.guide,
  marketingRoutes.home,
] as const);

const [account, login] = group(publicLayout, [
  accountRoutes.account,
  accountRoutes.login,
] as const);

const appRoutes = {
  guide,
  home,
  account,
  login,
} as const;

export type AppRoutes = typeof appRoutes;

declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: AppRoutes;
  }
}

export function createServerAppRouter(url: string | URL) {
  return createStaticRouter(appRoutes, url, {
    middleware: [withAuth("/login")],
    notFound: notFoundRoute,
  });
}

export function createClientAppRouter() {
  return createBrowserRouter(appRoutes, {
    middleware: [withAuth("/login")],
    notFound: notFoundRoute,
  });
}

export { appRoutes, notFoundRoute };
