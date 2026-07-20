import type { Box, Kind, Lifecycle, Namespace } from "./encodings.js";

/**
 * Root CSS class names, shared with `styles.css`. The `ds` prefix follows the
 * app-wide component convention (see `ExampleComponent`).
 */
export const CHIP_CSS_CLASS_NAME = "ds chip";
export const LEGEND_CSS_CLASS_NAME = "ds chip-legend";

/**
 * Namespace assumed when a URI carries no recognised prefix. The docsite's
 * own vocabulary is the ambient home for local mentions, and a chip must
 * never block prose from rendering, so unknown prefixes degrade here rather
 * than throwing.
 */
export const DEFAULT_NAMESPACE: Namespace = "docs";

/** A mention names a thing (an ABox individual) unless it says otherwise. */
export const DEFAULT_BOX: Box = "instance";

/** Chips are lifecycle-silent unless the mention has something to say. */
export const DEFAULT_LIFECYCLE: Lifecycle = "none";

/**
 * Route prefix per entity kind for `resolveChipHref`. These anticipate the
 * docsite's canonical landing pages (the D31 landing rule: a chip click lands
 * on the noun's home). The full D31 landing map replaces this table when the
 * routes exist; until then every kind resolves to `<prefix>/<encoded uri>`.
 * `component` and `term` are live: their routes exist (`/components/:uri`,
 * `/definitions/:term` — the Definitions lens is the glossary's home), and
 * `routeQueries.tests.ts` pins each against its route's `render()`.
 */
export const ROUTE_PREFIX_BY_KIND: { readonly [K in Kind]: string } = {
  component: "/components",
  pattern: "/patterns",
  standard: "/standards",
  concept: "/concepts",
  term: "/definitions",
  token: "/tokens",
};
