/**
 * THE CLOSED TABLE OF DEPLOYMENTS — every lens→class binding this build can
 * be pointed at, and the pure rule that picks one.
 *
 * `#lib/graphBindings/index.js` selects from here at module scope and
 * re-exports the chosen table as `GRAPH_BINDINGS`. That split is the point:
 * READING the environment is impure and effectively untestable, CHOOSING a
 * table is neither. {@link selectDeployment} takes the name as an argument,
 * so the fail-safe behaviour below is pinned by a unit test rather than
 * discovered in production with an empty page.
 *
 * WHY A TABLE AND NOT A URI. A deployment names a KEY, never a class. A typo
 * therefore cannot produce a *wrong* binding — only the default — and no
 * value from outside the build can make a lens query a class this repo never
 * declared. That closure is what makes selecting by environment variable
 * defensible at all; see the trade-off recorded in `index.ts`'s header.
 *
 * WHAT WOULD BREAK WITHOUT IT. The despecialisation proof
 * (`test/e2e/metro.e2e.ts`) boots the real app against
 * `@canonical/prism-graph-example`. The Definitions lens takes its variables
 * from the URL and needs nothing from here, but the Standards lens roots at
 * `ontologyClass(uri:)` with a class supplied from outside the graph. Without
 * a second table the Standards lens can only ever be shown against pragma,
 * and the neutrality claim stops one lens short of the two it can make.
 */

/** One lens's binding to the class it enumerates. */
export interface LensBinding {
  /** The class this lens enumerates. Prefixed form. */
  readonly classUri: string;
}

/**
 * The lenses every deployment must bind — ONE key set, enforced by the
 * compiler rather than by convention.
 *
 * A deployment that has no lens for a key still has to name a class for it
 * (see `metro.components`), because the key set is what lets consumers read
 * `GRAPH_BINDINGS.components` without knowing which deployment answered.
 */
export interface DeploymentBindings {
  /** The reading lens's class. Its instances are the standards. */
  readonly standards: LensBinding;
  /**
   * The components lens's class. Also the term inspector's D31 landing rule:
   * an instance links to `/components/:uri` only when its own class IS this
   * one.
   */
  readonly components: LensBinding;
  /** The lobby's third counted door. */
  readonly patterns: LensBinding;
}

/** The deployment used when nothing selects one. */
export const DEFAULT_DEPLOYMENT = "pragma";

/**
 * The variable that selects a deployment.
 *
 * `VITE_` is mandatory, not decorative: Vite exposes only `VITE_*`-prefixed
 * variables to a client bundle, and the client is one of this table's three
 * readers (see `index.ts`'s header for the other two and for why they have
 * to agree).
 */
export const DEPLOYMENT_ENV_VAR = "VITE_PRISM_DEPLOYMENT";

/**
 * Every deployment this build knows how to be.
 *
 * PREFIXED FORM THROUGHOUT. These are ARGUMENTS to `ontologyClass(uri:)`,
 * which echoes back the ABSOLUTE IRI — so nothing may compare a value from
 * here against a `uri` the graph returned without running it through
 * `toPrefixedUri` first.
 */
export const DEPLOYMENTS = {
  /** The docsite's own graph: pragma's design-system ontologies. */
  pragma: {
    standards: { classUri: "cs:CodeStandard" },
    components: { classUri: "ds:Component" },
    patterns: { classUri: "ds:Pattern" },
  },

  /**
   * `@canonical/prism-graph-example` — a fictional metro network, and the
   * only provider in this repo written by someone who has never heard of
   * pragma. Selecting it is how the despecialisation proof points the
   * Standards lens at a foreign graph.
   *
   * `metro:Station` rather than `metro:Stop`: the dataset holds 14 Stations
   * and 2 Interchanges (a Station subclass), so the index renders TWO group
   * sections and the jump-nav is exercised. `metro:Stop` yields one group and
   * a rail that never appears — a lens that renders is not the same as a lens
   * that renders its structure. (Dataset facts —
   * `packages/docsite/graph-example/src/lib/provider/dataset.ts`.)
   *
   * `geo:GeoPoint` for `components` is chosen because it has ZERO instances
   * in that dataset: it appears only as an embedded `location` value. This
   * deployment has no components lens, so the key must be filled with a class
   * whose instances can never make the D31 landing rule link a reader into a
   * route metro cannot serve. `metro.e2e.ts` asserts that outcome directly —
   * zero `href="/components/` across every metro response.
   */
  metro: {
    standards: { classUri: "metro:Station" },
    components: { classUri: "geo:GeoPoint" },
    patterns: { classUri: "geo:Zone" },
  },
} as const satisfies Record<string, DeploymentBindings>;

/**
 * The deployment `name` selects, or {@link DEFAULT_DEPLOYMENT} when it names
 * nothing this build knows.
 *
 * FAIL-SAFE, DELIBERATELY: an unset, empty or unrecognised name yields
 * exactly the table this app shipped before deployments existed. A misspelt
 * variable degrades to the default rather than to an empty page, and every
 * test written against the pragma bindings keeps passing untouched.
 */
export function selectDeployment(name: string | undefined): DeploymentBindings {
  if (name === undefined || name.length === 0) return DEPLOYMENTS.pragma;
  return (
    (DEPLOYMENTS as Record<string, DeploymentBindings>)[name] ??
    DEPLOYMENTS.pragma
  );
}
