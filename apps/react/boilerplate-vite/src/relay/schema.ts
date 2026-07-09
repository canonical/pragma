/**
 * Executable mock schema for the Relay data layer.
 *
 * Builds the SDL in ./schema.graphql into a graphql-js schema backed by a
 * small, deterministic in-memory catalog, so the app (and its tests and
 * Storybook) can execute real GraphQL operations without a backend. The
 * dataset is static — no randomness, no clocks — which keeps unit tests and
 * visual tests reproducible.
 *
 * (The file name above is deliberately not backtick-quoted:
 * vite-plugin-relay-lite's tag scanner matches the word "graphql" followed
 * by a backtick even inside comments, and would try to parse what follows
 * as a GraphQL document.)
 */

import { buildSchema, GraphQLError, graphql } from "graphql";
import schemaSource from "./schema.graphql?raw";

/** A product row in the in-memory catalog. */
export interface ProductRecord {
  /** Discriminant used by graphql-js to resolve the `Node` interface. */
  readonly __typename: "Product";
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly priceCents: number;
  readonly currency: string;
  readonly rating: number;
  readonly inStock: boolean;
}

/**
 * The full catalog, in stable order. IDs follow the `Product:{n}` global-ID
 * convention consumed by `Query.node`; they are opaque to clients.
 */
export const CATALOG_PRODUCTS: readonly ProductRecord[] = [
  {
    __typename: "Product",
    id: "Product:1",
    name: "Vanguard Workstation",
    tagline: "A certified Ubuntu desktop for heavy compilation workloads",
    priceCents: 189_900,
    currency: "USD",
    rating: 4.7,
    inStock: true,
  },
  {
    __typename: "Product",
    id: "Product:2",
    name: "Meridian Laptop 14",
    tagline: "Thin, quiet, and pre-loaded with your team's golden image",
    priceCents: 129_900,
    currency: "USD",
    rating: 4.5,
    inStock: true,
  },
  {
    __typename: "Product",
    id: "Product:3",
    name: "Beacon Micro Server",
    tagline: "A fanless edge node that fits in a network cabinet",
    priceCents: 64_900,
    currency: "USD",
    rating: 4.2,
    inStock: false,
  },
  {
    __typename: "Product",
    id: "Product:4",
    name: "Atlas Rack Server",
    tagline: "Dense compute for private-cloud deployments",
    priceCents: 449_900,
    currency: "USD",
    rating: 4.8,
    inStock: true,
  },
  {
    __typename: "Product",
    id: "Product:5",
    name: "Harbor NAS Enclosure",
    tagline: "Four bays of quiet, snapshot-friendly storage",
    priceCents: 89_900,
    currency: "USD",
    rating: 4.1,
    inStock: true,
  },
  {
    __typename: "Product",
    id: "Product:6",
    name: "Relay IoT Gateway",
    tagline: "Bridges field sensors onto your message bus securely",
    priceCents: 29_900,
    currency: "USD",
    rating: 3.9,
    inStock: false,
  },
];

const productsById = new Map(
  CATALOG_PRODUCTS.map((product) => [product.id, product]),
);

const CURSOR_PREFIX = "cursor:";

/** Encodes a catalog index as an opaque connection cursor. */
const encodeCursor = (index: number): string => `${CURSOR_PREFIX}${index}`;

/** Decodes a connection cursor back to a catalog index; rejects foreign cursors. */
const decodeCursor = (cursor: string): number => {
  const index = Number(cursor.slice(CURSOR_PREFIX.length));
  if (!cursor.startsWith(CURSOR_PREFIX) || !Number.isInteger(index)) {
    throw new GraphQLError(`Invalid cursor: ${cursor}`);
  }
  return index;
};

interface ProductsArguments {
  readonly first?: number | null;
  readonly after?: string | null;
}

/**
 * Resolves `Viewer.products` with honest forward cursor pagination: `after`
 * positions the window just past the given cursor, `first` bounds its size,
 * and `pageInfo` reflects whether more of the catalog remains.
 */
const resolveProducts = ({ first, after }: ProductsArguments) => {
  if (typeof first === "number" && first < 0) {
    throw new GraphQLError(
      `Argument "first" must be non-negative, got ${first}`,
    );
  }
  const startIndex = after == null ? 0 : decodeCursor(after) + 1;
  const endIndex = first == null ? CATALOG_PRODUCTS.length : startIndex + first;
  const edges = CATALOG_PRODUCTS.slice(startIndex, endIndex).map(
    (node, offset) => ({
      cursor: encodeCursor(startIndex + offset),
      node,
    }),
  );

  return {
    edges,
    pageInfo: {
      endCursor: edges.at(-1)?.cursor ?? null,
      hasNextPage: startIndex + edges.length < CATALOG_PRODUCTS.length,
    },
    totalCount: CATALOG_PRODUCTS.length,
  };
};

const schema = buildSchema(schemaSource);

// Root value for graphql-js's default field resolver: root fields are
// functions receiving the field arguments, and `Viewer.products` is a method
// on the viewer object for the same reason. `Node` resolution relies on the
// `__typename` discriminant each record carries.
const rootValue = {
  node: ({ id }: { id: string }) => productsById.get(id) ?? null,
  viewer: () => ({
    name: "Ada Lovelace",
    products: (args: ProductsArguments) => resolveProducts(args),
  }),
};

/** Input for {@link executeLocalOperation}. */
export interface ExecuteLocalOperationOptions {
  /** Full GraphQL source text of the operation. */
  readonly text: string;
  /** Variable values for the operation. */
  readonly variables?: Record<string, unknown>;
}

/** Result shape of {@link executeLocalOperation} — a standard GraphQL response. */
export interface LocalOperationResult {
  readonly data?: unknown;
  readonly errors?: readonly { readonly message: string }[];
}

/**
 * Executes a GraphQL operation against the in-memory catalog schema.
 *
 * This is the execution half of the mock backend: `relay.config.json` points
 * the compiler at ./schema.graphql for validation and codegen, and the Relay
 * environment's local executor calls this function at runtime.
 */
export const executeLocalOperation = async (
  options: ExecuteLocalOperationOptions,
): Promise<LocalOperationResult> => {
  const result = await graphql({
    schema,
    source: options.text,
    variableValues: options.variables,
    rootValue,
  });

  return {
    data: result.data ?? null,
    errors: result.errors?.map((error) => error.toJSON()),
  };
};
