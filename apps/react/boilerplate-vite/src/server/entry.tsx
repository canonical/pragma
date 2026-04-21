import { createHeadCollector, HeadProvider } from "@canonical/react-head";
import { Outlet, RouterProvider } from "@canonical/router-react";
import type { ReactElement } from "react";
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
          <Outlet fallback={<p>Loading…</p>} />
        </RouterProvider>
      </HeadProvider>
    ),
  };
}
