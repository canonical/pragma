import { route } from "@canonical/router-core";
import PlaygroundPage from "./PlaygroundPage.js";

const routes = {
  playground: route({
    url: "/playground",
    content: PlaygroundPage,
  }),
} as const;

export default routes;
