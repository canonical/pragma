import { createHeadCollector, HeadProvider } from "@canonical/react-head";
import { Outlet, RouterProvider } from "@canonical/router-react";
import type { ReactElement } from "react";
import Navigation from "../lib/Navigation/index.js";
import { createServerAppRouter } from "../routes.js";

export interface SSRResult {
  readonly router: ReturnType<typeof createServerAppRouter>;
  readonly headCollector: ReturnType<typeof createHeadCollector>;
  readonly tree: ReactElement;
}

export function prepareSSR(url: string): SSRResult {
  const router = createServerAppRouter(url);
  const headCollector = createHeadCollector();

  return {
    router,
    headCollector,
    tree: (
      <HeadProvider collector={headCollector}>
        <RouterProvider router={router}>
          <div className="app-shell">
            <header className="shell-header">
              <Navigation />
            </header>
            <main>
              <Outlet fallback={<p>Loading…</p>} />
            </main>
          </div>
        </RouterProvider>
      </HeadProvider>
    ),
  };
}
