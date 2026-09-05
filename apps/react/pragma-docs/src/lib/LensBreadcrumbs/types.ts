import type { HTMLAttributes } from "react";

/**
 * The named lens-index routes a breadcrumb trail can link back to — the
 * lens keys the Rail's `LENS_ENTRIES` register, all param-less. Kept a
 * closed union (not `RouteName<RegisteredRouteMap>`) so the back-link crumb
 * can only target a real index route, and so the router `Link` adapter can
 * pass `to={lensRouteName}` with no params, the way every index route wants.
 */
export type LensRouteName =
  | "home"
  | "components"
  | "definitions"
  | "standards"
  | "journeys";

/**
 * The static index path for each lens route — the `url` the linked lens
 * crumb carries so the DS `Breadcrumbs.Item` treats it as navigable (its
 * own contract: an item with no `url` renders as plain text, never the
 * injected link). The router `Link` adapter navigates by ROUTE NAME, not by
 * this href, so the path here only has to be the honest destination the
 * anchor points at; it stays in lockstep with the route table by being the
 * one place these paths are named.
 */
export const LENS_INDEX_PATH: Readonly<Record<LensRouteName, string>> = {
  home: "/",
  components: "/components",
  definitions: "/definitions",
  standards: "/standards",
  journeys: "/journeys",
};

export interface LensBreadcrumbsProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The lens's own name — the trail's first (and, on an index page, only)
   * crumb, matching how the Rail's `LENS_ENTRIES` labels it. */
  readonly lensLabel: string;
  /** The lens's index route, the crumb the back-link points at. On an
   * index page the same crumb is the terminal one and renders as text. */
  readonly lensRouteName: LensRouteName;
  /** The current entity/term/reading page's crumb text — the URL-derived
   * identity (the route param: a prefixed URI or slug). Absent on the lens
   * index, where the lens crumb IS the current page. */
  readonly current?: string;
}
