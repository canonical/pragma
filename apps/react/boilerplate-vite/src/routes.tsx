import { useTranslation } from "@canonical/i18n-react";
import {
  type AnyRoute,
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
import catalogRoutes from "#domains/catalog/routes.js";
import contactRoutes from "#domains/contact/routes.js";
import marketingRoutes from "#domains/marketing/routes.js";
import Navigation from "#lib/Navigation/index.js";

const protectedPaths = new Set(["/account"]);

function hasDemoAuth(search: unknown): boolean {
  const authValue = (search as Record<string, unknown>)?.auth;

  return authValue === "1";
}

/**
 * Auth decision for an already-matched route, from the router's own data —
 * the matched pattern and the schema-validated search. Deriving it from the
 * raw URL would normalize differently from the router (trailing slashes,
 * duplicate search values) and let a protected page render unauthenticated.
 */
export function getAuthRedirectForMatch(match: {
  readonly route: AnyRoute;
  readonly search: unknown;
  readonly pathname: string;
}): string | null {
  if (!protectedPaths.has(match.route.url) || hasDemoAuth(match.search)) {
    return null;
  }

  return `/login?from=${encodeURIComponent(match.pathname)}`;
}

export function withAuth(loginPath: string): RouteMiddleware {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;
    }

    const currentWarm = currentRoute.warm;
    const guardedWarm = (
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

      if (currentWarm) {
        return currentWarm(params, search, context);
      }
    };

    // Overriding `warm` widens the property's type, so the object needs a
    // local assertion back to TRoute; the middleware's signature itself is
    // now the real generic contract.
    return { ...currentRoute, warm: guardedWarm } as TRoute;
  };
}

const publicLayout = wrapper<ReactElement>({
  id: "public-layout",
  component: ({ children }: { children: ReactNode }) => (
    <div className="subgrid app-shell">
      <header className="subgrid shell-header">
        <Navigation />
      </header>
      <main className="subgrid">{children}</main>
    </div>
  ),
});

function NotFoundPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <section>
      <h1>{t("notFound.heading")}</h1>
      <p>{t("notFound.body")}</p>
    </section>
  );
}

const notFoundRoute = route({
  url: "/not-found",
  content: NotFoundPage,
});

const [guide, home] = group(publicLayout, [
  marketingRoutes.guide,
  marketingRoutes.home,
] as const);

const [account, login] = group(publicLayout, [
  accountRoutes.account,
  accountRoutes.login,
] as const);

const [contact] = group(publicLayout, [contactRoutes.contact] as const);

const [catalog] = group(publicLayout, [catalogRoutes.catalog] as const);

// Static redirect route: matched entirely from the URL, no content — the
// router (and the SSR disposition helper) answers with a real 301. Static
// redirects accept 301 or 308 only; runtime redirect() covers the 302 family.
const legacyHome = route({
  url: "/home",
  redirect: "/",
  status: 301,
});

const appRoutes = {
  guide,
  home,
  legacyHome,
  account,
  login,
  contact,
  catalog,
} as const;

export type AppRoutes = typeof appRoutes;

declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: AppRoutes;
  }
}

export const middleware = [withAuth("/login")] as const;

export { appRoutes, notFoundRoute };
