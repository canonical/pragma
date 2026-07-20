/**
 * The Home lobby's query contract (the `standardsIndexQuery.ts` sibling):
 * the compiled `LobbyQuery` operation plus the one variables builder,
 * shared by the server prepare step (`routes.ts` meta), the client
 * prefetch seam (`warmRouteQuery`), and the page's hook — byte-identical
 * variables everywhere. Artifact-only imports: this module rides the
 * server bricks' native import chain; the tag lives in `HomePage.tsx`.
 *
 * ── The honest-count ruling (AV-350 ground truth) ──────────────────────
 *
 * The lobby's two projections both hang off `ontologyClass`, and that is
 * a correctness decision, not a convenience one. The entity connections
 * (`components`, `codeStandards`, …) expose NO `totalCount`, and they cap
 * at a hard 100 per page (ke-graphql MAX_PAGE_SIZE — asking for 500
 * silently clamps, verified live). So counting edges off a connection
 * would report "100" for a class holding 131 standards and "100" for one
 * holding 108 components — a capped number that READS as a total. On the
 * front page that is worse than no number at all.
 *
 * `OntologyClass.instanceCount` is the honest seam: it counts named
 * instances in the store, uncapped. Verified against exhaustive
 * pagination at capture time — instanceCount === the true edge total for
 * every class the lobby names:
 *
 *   ds:Component      instanceCount 108 === 108 paginated
 *   ds:Pattern        instanceCount  41 ===  41 paginated
 *   cs:CodeStandard   instanceCount 131 === 131 paginated  (the cap lies here)
 *
 * The numbers themselves are NEVER pinned in code or tests — the graph
 * moves (the 111→108 lesson). They are read live and asserted only
 * structurally (floors, cross-checks against the same HTML).
 *
 * Definitions gets NO count: the honest quantity for that lens is "terms"
 * (classes + properties across ontologies), which is a shape the schema
 * serves only by walking every ontology — not cheap, and not what
 * `instanceCount` means. The lobby therefore names the Definitions door
 * without a number rather than inventing one. Guides likewise: it is a
 * stub route and the copy says so.
 */

import type { LobbyQuery$variables } from "#relay/__generated__/LobbyQuery.graphql.js";
import lobbyQueryNode from "#relay/__generated__/LobbyQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/**
 * The class URIs the lobby's counted doors read. Prefixed form: the
 * `ontologyClass(uri:)` argument accepts it and echoes back the full IRI
 * (verified live), which is why nothing here compares URIs for identity.
 */
export const LOBBY_COMPONENT_CLASS = "ds:Component";
export const LOBBY_PATTERN_CLASS = "ds:Pattern";
export const LOBBY_STANDARD_CLASS = "cs:CodeStandard";

/**
 * How many exemplar components the hero's projection lists. A handful:
 * the band shows the graph rather than summarising it, and the door
 * beside it carries the honest total. Not a page size — this projection
 * never paginates.
 */
export const LOBBY_EXEMPLAR_COUNT = 6;

/** The compiled operation (full text under `params.text`, `id: null`). */
export { lobbyQueryNode };

/**
 * The lobby's variables — a degenerate constant builder (the route has no
 * params and no search schema), so the server-executed operation, the
 * prefetch warm-up, and the component's store read use identical values.
 */
export const lobbyVariables = (): LobbyQuery$variables => ({
  componentClass: LOBBY_COMPONENT_CLASS,
  patternClass: LOBBY_PATTERN_CLASS,
  standardClass: LOBBY_STANDARD_CLASS,
  exemplars: LOBBY_EXEMPLAR_COUNT,
});

/**
 * The route's one query entry — parked under BOTH `meta` (the P-2 server
 * prepare contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`.
 */
export const lobbyRouteEntry: RouteQueryEntry = {
  query: lobbyQueryNode,
  variables: lobbyVariables,
};
