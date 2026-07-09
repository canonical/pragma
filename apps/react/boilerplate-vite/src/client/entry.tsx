import { HeadProvider } from "@canonical/react-head";
import { createBrowserRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import { RelayEnvironmentProvider } from "react-relay";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/index.css";

const router = createBrowserRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

// One Relay environment (network + normalized store) for the whole browser
// session — module scope, so client-side navigations share the cache.
const relayEnvironment = createEnvironment();

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element "#root" not found');
}

hydrateRoot(
  root,
  <HeadProvider>
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <RouterProvider router={router}>
        <Outlet fallback={<p>Loading…</p>} />
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>,
);
