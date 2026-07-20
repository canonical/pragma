import { route } from "@canonical/router-core";
import { createElement } from "react";
import GuidePage from "./GuidePage.js";
import HomePage from "./HomePage.js";

// Element-creating arrows, never bare components — see the rationale in
// src/domains/components/routes.ts (Outlet hook attribution).
const routes = {
  home: route({
    url: "/",
    content: (props) => createElement(HomePage, props),
  }),
  guide: route({
    url: "/guides/:slug",
    content: (props) => createElement(GuidePage, props),
  }),
} as const;

export default routes;
