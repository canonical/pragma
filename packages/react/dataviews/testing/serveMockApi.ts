import type { RequestHandler } from "msw";
import { type SetupServerApi, setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect } from "vitest";

/**
 * Serve mock endpoints to every test in the calling file, and nothing else:
 * a request no handler answers fails the test that sent it, so no test can
 * reach the network, and a story sending a request to the wrong path cannot
 * pass by showing the failure its source turns that into. The handlers are
 * stateless, so no test's requests change what the next test is answered.
 *
 * The server is returned, so a test can answer a request its own way with
 * `server.use`; what a test adds is removed once it ends. A request no
 * handler matches counts against the test running when it is sent.
 *
 * @note Impure: registers the file's lifecycle hooks, and intercepts the
 * global fetch while the file's tests run.
 */
export default function serveMockApi(
  handlers: readonly RequestHandler[],
): SetupServerApi {
  const server = setupServer(...handlers);
  /** The requests no handler answered since the last test ended. */
  const unhandled: string[] = [];
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: (request, print) => {
        unhandled.push(`${request.method} ${request.url}`);
        print.error();
      },
    });
  });
  // A request no handler matches only rejects a fetch, which a source shows as
  // a failure a test may never read; the test fails here instead.
  afterEach(() => {
    server.resetHandlers();
    expect(unhandled.splice(0)).toEqual([]);
  });
  // A request sent after the last test's check is still one no handler
  // answered.
  afterAll(() => {
    try {
      expect(unhandled.splice(0)).toEqual([]);
    } finally {
      server.close();
    }
  });
  return server;
}
