/**
 * WHICH CLASS POWERS WHICH LENS — the app's one binding table.
 *
 * The contract's entire root surface is five structural fields (`node`,
 * `ontologies`, `ontology`, `ontologyClass`, `ontologyProperty`) and NONE
 * of them names a subject. A lens that enumerates things therefore needs a
 * class URI supplied from OUTSIDE the graph, and this module is that
 * outside. A fork points the docsite at its own ontology by editing this
 * file and nothing else — no query, no component, no route, no test.
 *
 * This generalises an answer the app had already reached rather than
 * inventing one: `domains/marketing/lobbyQuery.ts` has shipped its three
 * class URIs as plain module constants since the lobby landed, and
 * `HomePage.tsx` has rooted at `ontologyClass(uri:)` all along. Those
 * three names now re-export from here.
 *
 * ── Three traps, each of which this module's shape exists to avoid ──
 *
 * PREFIXED FORM, ALWAYS. `ontologyClass(uri:)` takes `String!` and accepts
 * the prefixed convenience form on both known providers (ke-graphql
 * `wireRelay.ts`; graph-example `createExampleProvider.ts`, `expandUri`).
 * But it ECHOES BACK THE ABSOLUTE IRI, so nothing may compare a value from
 * this module against a `uri` the graph returned. Compare
 * server-normalised IRIs against each other, or run the string through
 * `toPrefixedUri` first.
 *
 * NOT AN ENV VAR, DELIBERATELY. These strings become GraphQL *variables*,
 * and the SSR prepare step and the client hydration must compute
 * byte-identical variables or the warmed store does not fulfil the
 * client's operation. `graphqlEndpoint.ts` documents that `VITE_*`
 * resolves DIFFERENTLY in the client build (misses, falls back) and in the
 * SSR renderer (reads `process.env` at runtime) — harmless for an endpoint
 * URL, silently corrupting for a query variable. A module constant cannot
 * diverge. If a deployment ever needs an override it is added HERE, behind
 * the same export.
 *
 * THE ACCEPTANCE GATE MUST NEVER READ IT. `packages/docsite/graph-example`
 * supplies its own binding (`metro:Station`) through
 * `LENS_OPERATION_VARIABLES`. The two never meet, and that is the point:
 * the gate proves the OPERATION is neutral, this module proves the
 * DEPLOYMENT is pointed somewhere. Coupling them would make the gate go
 * green because the app agreed with itself.
 */

/** One lens's binding to the class it enumerates. */
export interface LensBinding {
  /** The class this lens enumerates. Prefixed form. */
  readonly classUri: string;
}

/**
 * The deployment's lens → class table. Prefixed form throughout (see the
 * module header): these are ARGUMENTS to `ontologyClass(uri:)`, never
 * values to compare a returned `uri` against.
 *
 * `standards` is the only entry a lens roots at today; `components` and
 * `patterns` are read by the lobby's counted doors, and `components`
 * additionally by the term inspector's D31 landing rule (an instance links
 * to `/components/:uri` only when its own class IS the components class).
 */
export const GRAPH_BINDINGS = {
  standards: { classUri: "cs:CodeStandard" },
  components: { classUri: "ds:Component" },
  patterns: { classUri: "ds:Pattern" },
} as const satisfies Record<string, LensBinding>;
