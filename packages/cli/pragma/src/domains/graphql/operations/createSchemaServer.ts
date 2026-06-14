/**
 * Boot a persistent ke store over in-memory TTL sources with the
 * ke-graphql schema plugin attached, and build the `/http` fetch handler
 * (GraphiQL + GraphQL, CORS, incremental delivery) over the compiled
 * schema. The caller owns the returned `dispose`.
 *
 * @note Impure — boots a ke store (WASM + TTL) and compiles the schema.
 */

import { createStore, type InlineSource, type Plugin } from "@canonical/ke";
import {
  createSchemaPlugin,
  type Diagnostic,
  type SchemaPluginApi,
} from "@canonical/ke-graphql";
import { createGraphQLHandler } from "@canonical/ke-graphql/http";
import { PragmaError } from "#error";

export interface CreateSchemaServerOptions {
  /** In-memory TTL sources to load into the store. */
  readonly sources: readonly InlineSource[];
  /** Prefix map handed to both the ke store and the compiler. */
  readonly prefixes: Readonly<Record<string, string>>;
}

export interface SchemaServer {
  /** Runtime-neutral fetch handler over the compiled schema. */
  readonly handler: ReturnType<typeof createGraphQLHandler>;
  /** Compiler diagnostics produced while building the schema. */
  readonly diagnostics: readonly Diagnostic[];
  /** Releases the underlying ke store. */
  readonly dispose: () => void;
}

export default async function createSchemaServer(
  options: CreateSchemaServerOptions,
): Promise<SchemaServer> {
  const plugin = createSchemaPlugin({ incremental: true });

  let store: Awaited<ReturnType<typeof createStore>>;
  try {
    store = await createStore({
      sources: [...options.sources],
      prefixes: options.prefixes,
      // biome-ignore lint/suspicious/noExplicitAny: Plugin generic variance
      plugins: [plugin as Plugin<any>],
    });
  } catch (error) {
    throw PragmaError.storeError(
      error instanceof Error ? error.message : String(error),
      { recovery: { message: "Check the TTL syntax of the sources." } },
    );
  }

  const api = store.api<SchemaPluginApi>("ke-graphql");
  if (!api) {
    store.dispose();
    throw PragmaError.storeError("ke-graphql plugin did not register its API", {
      recovery: { message: "This is an internal error; please report it." },
    });
  }

  const handler = createGraphQLHandler(api.schema, {
    context: () => api.createContext(store),
    graphiql: true,
    cors: true,
    incremental: true,
  });

  return {
    handler,
    diagnostics: api.diagnostics,
    dispose: () => store.dispose(),
  };
}
