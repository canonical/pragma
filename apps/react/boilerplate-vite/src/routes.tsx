import {
  type AnyRoute,
  createRouter,
  group,
  type NavigationContext,
  type RouteMap,
  type RouteMiddleware,
  type RouteParamValues,
  type RouterDehydratedState,
  redirect,
  route,
  wrapper,
} from "@canonical/router-core";
import { createHydratedRouter } from "@canonical/router-react";
import type { ReactElement, ReactNode } from "react";
import accountRoutes from "./domains/account/routes.js";
import marketingRoutes from "./domains/marketing/routes.js";

const protectedPaths = new Set(["/account"]);

function toUrl(input: string | URL): URL {
  if (input instanceof URL) {
    return input;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }

  return new URL(input, "https://router.local");
}

function toHref(input: string | URL): string {
  const url = toUrl(input);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function hasDemoAuth(search: unknown): boolean {
  const authValue = (search as Record<string, unknown>)?.auth;

  return authValue === "1";
}

export function getAuthRedirectHref(input: string | URL): string | null {
  const url = toUrl(input);

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

    const currentFetch = currentRoute.fetch;

    return {
      ...currentRoute,
      fetch: async (
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

        if (currentFetch) {
          return currentFetch(params, search, context);
        }

        return null;
      },
    };
  }) as RouteMiddleware;
}

const publicLayout = wrapper<void, ReactElement>({
  id: "public-layout",
  component: ({ children }: { children: ReactNode }): ReactElement => (
    <div className="public-layout">{children}</div>
  ),
});

const [guide, home] = group(publicLayout, [
  marketingRoutes.guide,
  marketingRoutes.home,
] as const);

export const appRoutes = {
  guide,
  home,
  ...accountRoutes,
} as const;

export type AppRoutes = typeof appRoutes;
export type AppInitialData = RouterDehydratedState<AppRoutes>;

declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: AppRoutes;
  }
}

const notFoundRoute = route({
  url: "/404",
  content: (): ReactElement => {
    return (
      <section className="route-panel stack" aria-labelledby="not-found-title">
        <p className="eyebrow">Fallback route</p>
        <h1 id="not-found-title">Page not found</h1>
        <p className="lede">
          The boilerplate also wires a typed not-found route for unmatched URLs.
        </p>
      </section>
    );
  },
});

export function createServerAppRouter(
  initialData?: RouterDehydratedState<RouteMap>,
) {
  return createRouter(appRoutes, {
    hydratedState: initialData,
    middleware: [withAuth("/login")],
    notFound: notFoundRoute,
  });
}

export function createHydratedAppRouter() {
  return createHydratedRouter(appRoutes, {
    middleware: [withAuth("/login")],
    notFound: notFoundRoute,
  });
}

export function normalizeRequestHref(input: string | URL): string {
  return toHref(input);
}
