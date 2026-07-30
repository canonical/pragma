import { route } from "@canonical/router-core";
import CatalogPage from "./CatalogPage.js";

const routes = {
  catalog: route({
    url: "/catalog",
    component: CatalogPage,
  }),
} as const;

export default routes;
