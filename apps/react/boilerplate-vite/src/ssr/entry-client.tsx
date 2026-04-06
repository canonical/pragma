import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import Navigation from "../Navigation.js";
import { createHydratedAppRouter } from "../routes.js";
import "../Application.css";
import "../index.css";
import Shell from "./Shell.js";

const router = createHydratedAppRouter();

hydrateRoot(
  document,
  <RouterProvider router={router}>
    <Shell
      lang={document.documentElement.lang || "en"}
      navigation={<Navigation />}
    >
      <Outlet fallback={<p className="route-fallback">Loading route…</p>} />
    </Shell>
  </RouterProvider>,
);
