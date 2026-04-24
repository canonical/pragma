import { route } from "@canonical/router-core";
import HomePage from "./HomePage.js";

const routes = {
  home: route({
    url: "/",
    content: HomePage,
  }),
} as const;

export default routes;
