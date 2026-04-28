import type { TemplateResult } from "lit";
import { hyperscalePage } from "./pages/hyperscale.js";
import { serverPage } from "./pages/server.js";

const DEFAULT_ROUTE = "/server";

const routes = {
  "/server": serverPage,
  "/server/hyperscale": hyperscalePage,
} as const satisfies Record<string, TemplateResult>;

export type AppRoute = keyof typeof routes;

export function isKnownRoute(pathname: string): pathname is AppRoute {
  return pathname in routes;
}

export function getTemplateForPath(pathname: string): TemplateResult {
  return routes[pathname as AppRoute] ?? routes[DEFAULT_ROUTE];
}
