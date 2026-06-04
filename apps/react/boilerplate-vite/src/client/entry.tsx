import { HeadProvider } from "@canonical/react-head";
import { type InitialData, InitialDataProvider } from "@canonical/react-hooks";
import { createBrowserRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/index.css";

const router = createBrowserRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element "#root" not found');
}

// The SSR payload (`window.__INITIAL_DATA__`) is the same object the server
// rendered from, so the client tree must mount `InitialDataProvider` with it —
// preferences read through it (theme, …) then match the server render and
// hydrate without a flash. Mirror the server entrypoint's structure exactly.
const initialData: InitialData =
  (window as { __INITIAL_DATA__?: InitialData }).__INITIAL_DATA__ ?? {};

hydrateRoot(
  root,
  <InitialDataProvider value={initialData}>
    <HeadProvider>
      <RouterProvider router={router}>
        <Outlet fallback={<p>Loading…</p>} />
      </RouterProvider>
    </HeadProvider>
  </InitialDataProvider>,
);
