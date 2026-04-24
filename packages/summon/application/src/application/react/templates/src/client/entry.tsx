import { HeadProvider } from "@canonical/react-head";
import { createBrowserRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/index.css";

const router = createBrowserRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

hydrateRoot(
  document.getElementById("root")!,
  <HeadProvider>
    <RouterProvider router={router}>
      <Outlet fallback={<p>Loading…</p>} />
    </RouterProvider>
  </HeadProvider>,
);
