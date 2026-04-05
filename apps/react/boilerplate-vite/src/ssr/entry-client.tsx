import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import Navigation from "../Navigation.js";
import { createHydratedAppRouter } from "../routes.js";
import "../Application.css";
import "../index.css";
import Shell from "./Shell.js";

const router = createHydratedAppRouter(window);

hydrateRoot(
  document,
  <Shell
    lang={document.documentElement.lang || "en"}
    navigation={
      <RouterProvider router={router}>
        <Navigation />
      </RouterProvider>
    }
  >
    <RouterProvider router={router}>
      <Outlet fallback={<p className="route-fallback">Loading route…</p>} />
    </RouterProvider>
  </Shell>,
);
