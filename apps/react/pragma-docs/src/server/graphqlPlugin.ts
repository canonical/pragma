/**
 * Vite plugin mounting the graph GraphQL endpoint at `/graphql`.
 *
 * Registering it as Connect middleware in both `configureServer` (dev) and
 * `configurePreviewServer` (preview) makes the endpoint exist uniformly under
 * plain `vite`, the Bun/Express dev servers (whose asset brick runs Vite's
 * middlewares), and `vite preview` — one mount point for every mode. The
 * backend itself boots lazily on the first `/graphql` request (see
 * `graphql.ts`), so loading this plugin at config time costs nothing.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { type GraphqlBackend, getGraphqlBackend } from "./graphql.js";

const GRAPHQL_ROUTE = "/graphql";

/** Buffer an incoming Node request body (GraphQL payloads are small). */
const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

/**
 * Adapt a Node request/response pair to the fetch-native handler. Exported
 * for the Express dev server, which mounts `/graphql` itself (ahead of
 * Vite's middleware stack) with the natively imported backend singleton.
 */
export const handleNodeRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  handle: GraphqlBackend["handle"],
): Promise<void> => {
  const method = req.method ?? "GET";
  const host = req.headers.host ?? "localhost";
  const body =
    method === "GET" || method === "HEAD" ? undefined : await readBody(req);
  const request = new Request(`http://${host}${req.url ?? GRAPHQL_ROUTE}`, {
    method,
    body: body && new Uint8Array(body),
    headers: Object.entries(req.headers).flatMap(([key, value]) =>
      value === undefined
        ? []
        : Array.isArray(value)
          ? value.map((item): [string, string] => [key, item])
          : [[key, value] as [string, string]],
    ),
  });
  const response = await handle(request);
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  if (response.body) {
    // Explicit reader loop: the DOM lib's ReadableStream type declares no
    // async iterator, even though the runtimes implement one.
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
};

/** The `/graphql` middleware, shared by dev and preview servers. */
const mountGraphql = (middlewares: import("vite").Connect.Server): void => {
  middlewares.use(GRAPHQL_ROUTE, (req, res) => {
    getGraphqlBackend()
      .then(({ handle }) => handleNodeRequest(req, res, handle))
      .catch((error: unknown) => {
        console.error("[graphql] request failed", error);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ errors: [{ message: "Internal error" }] }));
      });
  });
};

/** The Vite plugin wiring `/graphql` into dev and preview servers. */
export const graphqlPlugin = (): Plugin => ({
  name: "pragma-docs:graphql",
  configureServer(server) {
    mountGraphql(server.middlewares);
  },
  configurePreviewServer(server) {
    mountGraphql(server.middlewares);
  },
});
