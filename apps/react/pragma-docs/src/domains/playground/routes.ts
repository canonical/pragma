import { route } from "@canonical/router-core";
import { createElement } from "react";
import {
  ROUTE_QUERY_META_KEY,
  type RouteQueryEntry,
} from "#relay/routeQuery.js";
import PlaygroundPage from "./PlaygroundPage.js";
import {
  componentProbeQueryNode,
  componentProbeVariables,
} from "./probeQuery.js";

const routes = {
  playground: route({
    url: "/playground",
    // Element-creating arrow, never the bare component — see the rationale
    // in src/domains/components/routes.ts (Outlet hook attribution).
    content: (props) => createElement(PlaygroundPage, props),
    // The server bricks execute this entry in-process before rendering and
    // serialise the resulting store into `__INITIAL_DATA__.relay.records`
    // (see src/server/prepareRelayData.ts). The route has no params and no
    // search schema, so the variables builder is a degenerate constant.
    meta: {
      [ROUTE_QUERY_META_KEY]: {
        query: componentProbeQueryNode,
        variables: componentProbeVariables,
      } satisfies RouteQueryEntry,
    },
  }),
} as const;

export default routes;
