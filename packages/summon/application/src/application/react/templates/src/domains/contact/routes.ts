import { route } from "@canonical/router-core";
import ContactPage from "./ContactPage.js";

const routes = {
  contact: route({
    url: "/contact",
    content: ContactPage,
  }),
} as const;

export default routes;
