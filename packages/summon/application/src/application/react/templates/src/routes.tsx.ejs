import { group, route, wrapper } from "@canonical/router-core";
import type { ReactElement, ReactNode } from "react";
import marketingRoutes from "#domains/marketing/routes.js";
import Navigation from "#lib/Navigation/index.js";

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

const notFoundRoute = route({
  url: "/not-found",
  content: () => (
    <section>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
    </section>
  ),
});

const [home] = group(publicLayout, [marketingRoutes.home] as const);

const appRoutes = {
  home,
} as const;

export type AppRoutes = typeof appRoutes;

declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: AppRoutes;
  }
}

export const middleware: readonly [] = [] as const;

export { appRoutes, notFoundRoute };
