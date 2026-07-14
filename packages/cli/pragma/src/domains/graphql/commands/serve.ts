import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { DEFAULT_PORT } from "../constants.js";
import { gatherSources, parsePrefixes } from "../helpers/index.js";
import routeGraphql from "../helpers/routeGraphql.js";
import createSchemaServer, {
  type SchemaServer,
} from "../operations/createSchemaServer.js";

/** Narrow an unknown param to a string array. */
function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Parse the --port flag, falling back to the default on anything invalid. */
export function readPort(value: unknown): number {
  if (typeof value !== "string") {
    return DEFAULT_PORT;
  }
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port > 0 && port < 65536
    ? port
    : DEFAULT_PORT;
}

/**
 * Listen on `port` and block until the process is interrupted, then stop
 * the server and dispose the store.
 *
 * @note Impure — opens a network listener and registers signal handlers.
 */
/* v8 ignore start -- the live Bun.serve listener and signal loop run under `pragma graphql serve`, not unit tests */
async function listen(server: SchemaServer, port: number): Promise<void> {
  const httpServer = Bun.serve({
    port,
    fetch: (request) => routeGraphql(request, server.handler, port),
  });
  await new Promise<void>((resolve) => {
    const shutdown = (): void => {
      httpServer.stop();
      server.dispose();
      resolve();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}
/* v8 ignore stop */

/**
 * Builds the `pragma graphql serve` command definition.
 *
 * Compiles the configured ontologies (or explicit TTL sources) and serves
 * a local GraphQL + GraphiQL endpoint until interrupted. With no positional
 * sources it serves every TTL across the semantic packages in
 * `pragma.config.json`.
 */
const serveCommand: CommandDefinition = {
  path: ["graphql", "serve"],
  description:
    "Serve a local GraphQL + GraphiQL endpoint over the configured ontologies",
  parameters: [
    {
      name: "sources",
      description:
        "TTL files or globs to serve (default: the configured semantic packages)",
      type: "multiselect",
      positional: true,
    },
    {
      name: "port",
      description: `Port to listen on (default ${DEFAULT_PORT})`,
      type: "string",
    },
    {
      name: "prefix",
      description: "Ontology prefix as name=namespace (repeatable)",
      type: "multiselect",
    },
  ],
  meta: {
    examples: [
      "pragma graphql serve",
      "pragma graphql serve ontology.ttl --port 4001",
    ],
  },
  async execute(params, ctx): Promise<CommandResult> {
    if (typeof Bun === "undefined") {
      throw PragmaError.storeError(
        "`pragma graphql serve` requires the Bun runtime.",
        {
          recovery: {
            message: "Run the compiled `pragma` binary or use `bun run`.",
          },
        },
      );
    }

    const sources = await gatherSources(
      readStringArray(params.sources),
      ctx.cwd,
    );
    const prefixes = parsePrefixes(readStringArray(params.prefix));
    const port = readPort(params.port);

    const server = await createSchemaServer({ sources, prefixes });
    const errorCount = server.diagnostics.filter(
      (d) => d.severity === "error",
    ).length;
    process.stdout.write(
      `[ke-graphql] schema compiled — ${server.diagnostics.length} diagnostic(s)${
        errorCount > 0 ? `, ${errorCount} error(s)` : ""
      }\n[ke-graphql] GraphiQL on http://localhost:${port}/graphql (Ctrl-C to stop)\n`,
    );

    await listen(server, port);

    return createOutputResult(
      { port, diagnostics: server.diagnostics },
      { plain: () => `Stopped the graphql server on port ${port}.` },
    );
  },
};

export default serveCommand;
