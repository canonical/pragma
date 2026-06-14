// =============================================================================
// Shared types for the resolver domain: the Relay connection value shapes
// every resolver template returns, the pagination argument contract, and the
// scalar names the coercion helpers target. Grouped here because the
// connection helpers, the resolver templates, and the compiler's Relay
// wiring all exchange these shapes.
// =============================================================================

/** The four Relay pagination arguments accepted by connection fields. */
export interface ConnectionArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

/** A Relay connection page: edges with cursors plus pageInfo. */
export interface Connection<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

/** Anything carrying the URI identity used for cursor encoding and sorting. */
export interface Sortable {
  uri: string | null;
}

/** A paginated window over a URI list, computed before entity hydration. */
export interface UriPage {
  /** The page's URIs, in cursor domain (prefixed form). */
  window: string[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** The GraphQL scalar names a literal can be coerced to. */
export type ScalarName = "String" | "Boolean" | "Int" | "Float";
