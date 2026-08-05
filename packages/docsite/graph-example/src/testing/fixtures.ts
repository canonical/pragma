// =============================================================================
// Shared test fixtures.
//
// The lens variables are keyed by operation name and use metro-network IRIs
// throughout — if a lens can only be satisfied by a pragma IRI, it is not
// provider-neutral, and that is exactly what this gate is for.
// =============================================================================

/** A class every lens that looks a term up can be pointed at. */
export const SAMPLE_CLASS_URI = "metro:Station";

/** An entity every lens that looks an instance up can be pointed at. */
export const SAMPLE_ENTITY_URI = "https://metro.example/stop/northgate";

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
  StandardEntityQuery: { uri: SAMPLE_ENTITY_URI },
  StandardsIndexQuery: { count: 5, cursor: null },
  StandardsIndexPaginationQuery: { count: 5, cursor: null },
};
