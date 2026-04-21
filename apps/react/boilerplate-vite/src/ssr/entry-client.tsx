import { HeadProvider } from "@canonical/react-head";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import "../index.css";
import { createClientAppRouter } from "../routes.js";

const router = createClientAppRouter();

hydrateRoot(
  document,
  <HeadProvider>
    <RouterProvider router={router}>
      <Outlet fallback={<p>Loading…</p>} />
    </RouterProvider>
  </HeadProvider>,
);
