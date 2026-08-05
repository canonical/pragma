// =============================================================================
// Shared test fixtures.
//
// The lens variables are keyed by operation name and use metro-network IRIs
// throughout — if a lens can only be satisfied by a pragma IRI, it is not
// provider-neutral, and that is exactly what this gate is for.
// =============================================================================

/** A class every lens that looks a term up can be pointed at. */
export const SAMPLE_CLASS_URI = "metro:Station";

/**
 * An entity every lens that looks an instance up can be pointed at.
 *
 * This MUST be an IRI the dataset actually carries, and it must be
 * absolute: `node(id:)` takes the absolute IRI and nothing else, so
 * `metro:northgate` resolves to null here exactly as it would against
 * ke-graphql. The value was previously `https://metro.example/stop/…`,
 * which resolved to nothing at all after the dataset moved its instances
 * into the declared namespaces — harmless only for as long as every
 * operation that used it failed validation first, and a confusing
 * green-nulls failure the moment one of them started validating.
 */
export const SAMPLE_ENTITY_URI = "https://metro.example/onto#northgate";

/**
 * Variables for each lens operation, by operation name.
 *
 * An operation discovered without an entry here FAILS the gate rather than
 * skipping it: a lens nobody wrote variables for is a lens nobody tested.
 */
export const LENS_OPERATION_VARIABLES: Record<
  string,
  Record<string, unknown>
> = {
  DefinitionsExplorerQuery: { uri: SAMPLE_CLASS_URI, hasTerm: true },
  JourneysExplorerQuery: {
    jobs: 5,
    pairings: 5,
    uri: SAMPLE_ENTITY_URI,
    hasJob: true,
  },
  // The standards lens now reaches its collection through the TBox, so it
  // needs a class binding — and this is the gate's OWN binding, never the
  // app's. The app's runtime binding lives in
  // `apps/react/pragma-docs/src/lib/graphBindings`; importing it here would
  // couple the neutrality proof to the deployment it exists to be
  // independent of, and the gate would go green because the app agreed
  // with itself.
  StandardEntityQuery: { uri: SAMPLE_ENTITY_URI, classUri: SAMPLE_CLASS_URI },
  StandardsIndexQuery: {
    classUri: SAMPLE_CLASS_URI,
    count: 5,
    cursor: null,
  },
  StandardsIndexPaginationQuery: {
    classUri: SAMPLE_CLASS_URI,
    count: 5,
    cursor: null,
  },
};
