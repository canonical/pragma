import { HeadProvider } from "@canonical/react-head";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import "../index.css";
import Navigation from "../lib/Navigation/index.js";
import { createClientAppRouter } from "../routes.js";

const router = createClientAppRouter();

hydrateRoot(
  document,
  <HeadProvider>
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
  </HeadProvider>,
);
