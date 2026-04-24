import { route } from "@canonical/router-core";
import GuidePage from "./GuidePage.js";
import HomePage from "./HomePage.js";

const routes = {
  home: route({
    url: "/",
    content: HomePage,
  }),
  guide: route({
    url: "/guides/:slug",
    content: GuidePage,
  }),
} as const;

export default routes;
