import { route } from "@canonical/router-core";
import { fetchQuery } from "react-relay";
import { getBrowserEnvironment } from "#relay/environment.js";
import CatalogPage from "./CatalogPage.js";
import { PAGE_SIZE, productListQuery } from "./ProductList.js";

const routes = {
  catalog: route({
    url: "/catalog",
    // Navigation-time cache warm: fetch the first catalog page into the
    // browser session's Relay store so `useLazyLoadQuery` (store-or-network)
    // reads it without a second request. Fire-and-forget by design — the
    // route never blocks on it and no data is passed to the component; a
    // failed warm just falls back to the component's own fetch. `fetchQuery`
    // rather than `loadQuery`: the latter returns a reference that must be
    // disposed, which has no owner in a fire-and-forget hook (unretained data
    // sits in the store's release buffer and may eventually be GC'd —
    // harmless, it re-fetches).
    warm: () => {
      if (typeof document === "undefined") {
        return; // SSR: catalog content is ClientOnly; nothing to warm.
      }

      void fetchQuery(getBrowserEnvironment(), productListQuery, {
        count: PAGE_SIZE,
      })
        .toPromise()
        .catch(() => {});
    },
    content: CatalogPage,
  }),
} as const;

export default routes;
