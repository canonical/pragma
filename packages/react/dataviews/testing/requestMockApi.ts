/**
 * Requests a test sends the mock machine API, as a client would: the REST
 * endpoint by its query parameters and the GraphQL endpoint by its query
 * text and variables. Each answers with the parsed body and the status, so a
 * test reads a problem as plainly as a page.
 */

import type { ApiScenario } from "../src/storybook/machines/api/index.js";
import { MACHINES_QUERY_TEXT } from "../src/storybook/machines/api/index.js";
import type { MockApiAnswer } from "./types.js";

/** Where a test's requests are addressed; the handlers match any origin. */
const ORIGIN = "http://localhost";

/**
 * Ask the REST endpoint of one scenario.
 *
 * @note Impure: sends a request.
 */
export const requestRest = async (
  scenario: ApiScenario,
  params: string,
  signal?: AbortSignal,
): Promise<MockApiAnswer> => {
  const response = await fetch(
    new URL(`/api/${scenario}/machines?${params}`, ORIGIN),
    { signal: signal ?? null },
  );
  return { status: response.status, body: await response.json() };
};

/**
 * Ask the GraphQL endpoint of one scenario for one page of `MachinesQuery`.
 *
 * @note Impure: sends a request.
 */
export const requestGraphQL = async (
  scenario: ApiScenario,
  variables: Readonly<Record<string, unknown>>,
  signal?: AbortSignal,
): Promise<MockApiAnswer> => {
  const response = await fetch(new URL(`/graphql/${scenario}`, ORIGIN), {
    signal: signal ?? null,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: MACHINES_QUERY_TEXT,
      operationName: "MachinesQuery",
      variables,
    }),
  });
  return { status: response.status, body: await response.json() };
};
