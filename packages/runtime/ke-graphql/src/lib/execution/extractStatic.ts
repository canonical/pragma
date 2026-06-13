// =============================================================================
// Path B — static extraction at build time (KG.20).
//
// Runs every provided query against the compiled schema and returns the
// results keyed by name (callers write them to disk as static JSON). Only
// `uri`-typed variables are enumerable: for queries with a single required
// `uri: String!` variable, every instance URI of the relevant classes is
// substituted. Queries with other variables fail loudly rather than shipping
// partial data. Incremental payloads are always drained and merged.
// =============================================================================

import type { ExecutionResult, GraphQLSchema } from "graphql";
import type { CompilerContext, MappedIR } from "#compiler";
import { toPrefixed } from "#dataloader";
import {
  executeLocal,
  isIncrementalResults,
  mergeIncremental,
} from "./incremental.js";

/** One named query to extract, with optional variable definitions. */
export interface StaticQuery {
  name: string;
  text: string;
  /** Variable definitions: name → GraphQL type string (e.g. "String!"). */
  variables?: Record<string, string>;
}

/** Arguments for extractStatic: schema, IR, context, and the query set. */
export interface ExtractStaticOptions {
  schema: GraphQLSchema;
  mapped: MappedIR;
  context: CompilerContext;
  queries: StaticQuery[];
}

const isUriVariable = (type: string): boolean =>
  type === "String!" || type === "String" || type === "ID!" || type === "ID";

/**
 * List all named instance URIs (prefixed) across all concrete classes.
 *
 * @note Impure — loads every class's instance list from the store through
 * the context's list loader.
 */
const listEntityUris = async (
  mapped: MappedIR,
  context: CompilerContext,
): Promise<string[]> => {
  const uris: string[] = [];
  for (const type of mapped.types.values()) {
    if (type.embeddable) {
      continue;
    }
    const instances = await context.listLoader.load(type.owlUri);
    for (const full of instances) {
      uris.push(toPrefixed(full, mapped.namespaces));
    }
  }
  return uris;
};

/**
 * Execute the provided query set against the compiled schema and return the
 * results keyed by query name (queries with a single uri variable run once
 * per instance URI, keyed "name:uri"). Incremental payloads are drained and
 * merged. Throws on queries with non-enumerable variables rather than
 * shipping partial data (KG.20 Path B).
 *
 * @note Impure — executes every query against the store-backed context.
 */
export default async function extractStatic(
  options: ExtractStaticOptions,
): Promise<Map<string, ExecutionResult>> {
  const results = new Map<string, ExecutionResult>();

  const run = async (
    key: string,
    text: string,
    variableValues?: Record<string, unknown>,
  ) => {
    const result = await executeLocal({
      schema: options.schema,
      source: text,
      variableValues,
      contextValue: options.context,
    });
    results.set(
      key,
      isIncrementalResults(result) ? await mergeIncremental(result) : result,
    );
  };

  let entityUris: string[] | undefined;

  for (const query of options.queries) {
    const variableNames = Object.keys(query.variables ?? {});
    if (variableNames.length === 0) {
      await run(query.name, query.text);
      continue;
    }
    const [name] = variableNames;
    if (
      variableNames.length === 1 &&
      name === "uri" &&
      isUriVariable(query.variables?.[name] ?? "")
    ) {
      entityUris ??= await listEntityUris(options.mapped, options.context);
      for (const uri of entityUris) {
        await run(`${query.name}:${uri}`, query.text, { uri });
      }
      continue;
    }
    throw new Error(
      `extractStatic: query "${query.name}" has non-enumerable variables (${variableNames.join(
        ", ",
      )}) — static extraction supports only a single uri variable (KG.20 Path B)`,
    );
  }

  return results;
}
