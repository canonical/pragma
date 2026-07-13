/**
 * Executable mock schema for the Relay data layer.
 *
 * Builds the SDL in ./schema.graphql into a graphql-js schema backed by the
 * same static ontology slice the pure stories use (../fixtures/ontologySample),
 * so the projection component can execute real GraphQL operations without a
 * backend. The dataset is static — no randomness, no clocks — which keeps unit
 * tests and visual tests reproducible.
 *
 * (The file name above is written without a backtick after the word "graphql"
 * on purpose: vite-plugin-relay-lite's tag scanner matches that word followed
 * by a backtick, even inside comments, and would try to parse what follows.)
 */

import { buildSchema, GraphQLError, graphql } from "graphql";
import ontologySample from "../fixtures/ontologySample.js";
import schemaSource from "./schema.graphql?raw";

const schema = buildSchema(schemaSource);

const entitiesById = new Map(
  ontologySample.entities.map((entity) => [entity.id, entity]),
);

interface OntologyArguments {
  readonly focus?: string | null;
}

/**
 * Resolves `Query.ontology`. With no focus it returns the whole sample graph;
 * with a focus it returns that entity's immediate neighbourhood — the relations
 * incident to it and the entities those relations touch.
 */
const resolveOntology = ({ focus }: OntologyArguments) => {
  if (focus == null) {
    return ontologySample;
  }
  if (!entitiesById.has(focus)) {
    throw new GraphQLError(`Unknown focus entity: ${focus}`);
  }

  const relations = ontologySample.relations.filter(
    (relation) => relation.source === focus || relation.target === focus,
  );

  const neighbourIds = new Set<string>([focus]);
  for (const relation of relations) {
    neighbourIds.add(relation.source);
    neighbourIds.add(relation.target);
  }

  return {
    entities: ontologySample.entities.filter((entity) =>
      neighbourIds.has(entity.id),
    ),
    relations,
  };
};

// Root value for graphql-js's default field resolver: root fields are functions
// receiving the field arguments. `node` is present for schema completeness even
// though the projection query does not use it.
const rootValue = {
  node: ({ id }: { id: string }) => entitiesById.get(id) ?? null,
  ontology: (args: OntologyArguments) => resolveOntology(args),
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
 * Executes a GraphQL operation against the in-memory ontology schema. This is
 * the execution half of the mock backend: `relay.config.json` points the
 * compiler at ./schema.graphql for validation and codegen, and the Relay
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
