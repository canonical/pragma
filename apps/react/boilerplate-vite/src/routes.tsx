// @ts-nocheck
import {
  type AnyRoute,
  createRouter,
  type NavigationContext,
  type RouteParamValues,
  redirect,
  route,
} from "@canonical/router-core";
import { createHydratedRouter } from "@canonical/router-react";
import type { ReactElement } from "react";
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

export function withAuth(loginPath: string): any {
  return (currentRoute: AnyRoute) => {
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
  };
}

export const appRoutes = {
  ...marketingRoutes,
  ...accountRoutes,
} as const;

export type AppRoutes = typeof appRoutes;

export interface AppInitialData extends Record<string, unknown> {
  readonly href: string;
  readonly kind: "route" | "not-found" | "unmatched";
  readonly routeData: unknown;
  readonly routeId: keyof typeof appRoutes | null;
  readonly status: number;
  readonly wrapperData: Readonly<Record<string, unknown>>;
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

export function createServerAppRouter(initialData?: AppInitialData) {
  return createRouter(appRoutes, {
    hydratedState: initialData as any,
    middleware: [withAuth("/login")],
    notFound: notFoundRoute,
  } as any);
}

export function createHydratedAppRouter(browserWindow?: Window) {
  return createHydratedRouter(appRoutes, {
    browserWindow: browserWindow as any,
    middleware: [withAuth("/login")],
    notFound: notFoundRoute,
  } as any);
}

export function normalizeRequestHref(input: string | URL): string {
  return toHref(input);
}
