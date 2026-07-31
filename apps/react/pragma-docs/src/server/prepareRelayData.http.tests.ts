// @vitest-environment node

/**
 * The prepare step's HTTP contract, against a real socket.
 *
 * This is the suite that carries the PRD-3 process split. The e2e matrix
 * cannot: its probe cells need the pragma refs cache (`pragma sources
 * update`) to compile a schema, and a machine without one fails them for a
 * reason that has nothing to do with this wiring. So the wire format is
 * pinned here instead, against a stub HTTP server on an OS-assigned port —
 * no graph, no WASM, no refs cache, and no way for the assertions to pass
 * vacuously.
 *
 * What it pins:
 *
 * - the request LEAVES the process (the old prepare step called an
 *   in-process executor; nothing crossed a socket, so nothing could have
 *   been asserted about one);
 * - it carries the operation's full text and the route's variables;
 * - it carries `x-pragma-ssr: 1`, which is the graph server's only way to
 *   tell a server render from a browser and therefore the load-bearing half
 *   of the e2e suite's hit-counting assertions;
 * - the response is deserialised into the Relay store and handed back as
 *   `{records}`;
 * - an unreachable endpoint degrades (logged `undefined`) instead of
 *   throwing — a graph that is down must cost the page its data, not its
 *   200.
 *
 * The routes table is mocked with a VALID entry (the real
 * `ComponentProbeQuery` artifact and its real variables builder, exactly as
 * `src/relay/environment.tests.ts` uses them): `readRouteQueryEntry` demands
 * a non-empty `query.params.text` and a `variables` FUNCTION, so a
 * hand-rolled stub would be rejected during collection and every case here
 * would pass through the degradation path instead of the transport.
 */

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareRelayData } from "./prepareRelayData.js";

vi.mock("../routes.js", async () => {
  const { route } = await import("@canonical/router-core");
  const { ROUTE_QUERY_META_KEY } = await import("#relay/routeQuery.js");
  const { componentProbeVariables } = await import(
    "#domains/playground/probeQuery.js"
  );
  const { default: componentProbeQueryNode } = await import(
    "#relay/__generated__/ComponentProbeQuery.graphql.js"
  );
  return {
    appRoutes: {
      home: route({ url: "/", component: () => null }),
      playground: route({
        url: "/playground",
        component: () => null,
        meta: {
          [ROUTE_QUERY_META_KEY]: {
            query: componentProbeQueryNode,
            variables: () => componentProbeVariables(),
          },
        },
      }),
    },
    middleware: [],
    notFoundRoute: route({ url: "/not-found", component: () => null }),
  };
});

/** One captured request: what the prepare step actually put on the wire. */
interface CapturedRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: Record<string, unknown>;
}

const captured: CapturedRequest[] = [];
let server: Server;
let graphqlUrl: string;
let deadGraphqlUrl: string;

/**
 * An address nothing is listening on: an ephemeral port reserved by the OS
 * and immediately released. Reserved-then-closed rather than a hard-coded
 * low port, because the WHATWG "bad port" list makes `fetch` reject ports
 * like 1 before it ever opens a socket — which tests the URL parser, not the
 * degradation path.
 */
const reserveClosedPort = (): Promise<number> =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });

beforeAll(async () => {
  deadGraphqlUrl = `http://127.0.0.1:${await reserveClosedPort()}/graphql`;
  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        captured.push({
          method: req.method ?? "",
          url: req.url ?? "",
          headers: req.headers,
          body: JSON.parse(Buffer.concat(chunks).toString()) as Record<
            string,
            unknown
          >,
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              component: {
                id: "ds:global.component.button",
                uri: "ds:global.component.button",
                name: "Button",
              },
            },
          }),
        );
      });
    });
    // Port 0 — the OS picks a free one, so this suite never collides with
    // a real graph server or with a parallel worker.
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      graphqlUrl = `http://127.0.0.1:${port}/graphql`;
      resolve();
    });
  });
});

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);

describe("prepareRelayData over HTTP", () => {
  it("POSTs the route's operation to the graph endpoint and returns its records", async () => {
    const prepared = await prepareRelayData("/playground", graphqlUrl);

    // The request left the process.
    expect(captured).toHaveLength(1);
    const request = captured.at(0) as CapturedRequest;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/graphql");

    // …carrying the operation's full text and the route's variables.
    expect(request.body.operationName).toBe("ComponentProbeQuery");
    expect(typeof request.body.query).toBe("string");
    expect(request.body.query).toContain("query ComponentProbeQuery");
    expect(request.body.variables).toEqual({
      uri: "ds:global.component.button",
      count: 12,
    });

    // …and marked as server-side traffic, which is what lets the graph
    // server's hit log distinguish an SSR render from a browser.
    expect(request.headers["x-pragma-ssr"]).toBe("1");
    // The request shaper's content type survives the header merge (the
    // "set" strategy overwrites only the keys it names).
    expect(request.headers["content-type"]).toContain("application/json");

    // The response was deserialised into the store and handed back.
    expect(prepared).toBeDefined();
    expect(JSON.stringify(prepared?.records)).toContain("Button");
  });

  it("degrades to no records (logged) when the graph is unreachable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const prepared = await prepareRelayData("/playground", deadGraphqlUrl);
      expect(prepared).toBeUndefined();
      expect(consoleError.mock.calls).toContainEqual([
        expect.stringContaining(
          `relay prepare failed for /playground against ${deadGraphqlUrl}`,
        ),
        expect.anything(),
      ]);
    } finally {
      consoleError.mockRestore();
    }
  });
});
