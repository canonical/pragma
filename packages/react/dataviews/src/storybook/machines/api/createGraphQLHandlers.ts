import {
  delay,
  type GraphQLResponseBody,
  graphql,
  HttpResponse,
  type RequestHandler,
} from "msw";
import { machines } from "../fixtures.js";
import { API_SCENARIOS } from "./constants.js";
import foldStoredText from "./foldStoredText.js";
import readGraphQLQuery from "./readGraphQLQuery.js";
import selectRecords from "./selectRecords.js";
import type {
  ApiScenario,
  ApiTextMatch,
  MachinesData,
  MockApiConfig,
} from "./types.js";

/**
 * Whether a value holds text, as a resolver in JavaScript answers it: the
 * operand folded once per query, each value folded, then a plain substring
 * or prefix test, with no pattern to escape.
 */
const matchText = (operator: ApiTextMatch["operator"], text: string) => {
  const needle = foldStoredText(text);
  return operator === "contains"
    ? (value: string): boolean => foldStoredText(value).includes(needle)
    : (value: string): boolean => foldStoredText(value).startsWith(needle);
};

/** A cursor the endpoint hands back for the page starting after `offset`. */
const spellCursor = (offset: number): string => btoa(String(offset));

/**
 * One `MachinesQuery` answer, a page or an error, as the endpoint sends it.
 * The body type is named: msw does not infer it from the body.
 */
const respond = (body: GraphQLResponseBody<MachinesData>) =>
  HttpResponse.json<GraphQLResponseBody<MachinesData>>(body);

/** An answer carrying one error message and no data. */
const fail = (message: string) => respond({ errors: [{ message }] });

/**
 * The GraphQL machine endpoint, `POST /graphql/<scenario>`, once for every
 * scenario: `MachinesQuery` answers a forward connection over the records
 * the query matches, with no total, ordered by at most one term.
 *
 * Stateless, as the REST endpoint is: a request's answer depends on its path
 * and its variables alone.
 *
 * @note Impure: its handlers wait on timers before they answer.
 */
export default function createGraphQLHandlers({
  records = machines,
  latency = 0,
}: MockApiConfig = {}): readonly RequestHandler[] {
  const answer = async (
    scenario: ApiScenario,
    variables: Readonly<Record<string, unknown>>,
  ) => {
    if (scenario === "unanswered") {
      await delay("infinite");
    }
    await delay(latency);
    if (scenario === "down") {
      return fail("the machine inventory is unavailable");
    }
    const read = readGraphQLQuery(variables);
    if ("reason" in read) {
      return fail(read.reason);
    }
    if (scenario === "first-page-only" && read.offset > 0) {
      return fail("the machines past the first page are unavailable");
    }
    const matched = selectRecords(records, read.query, matchText);
    const page = matched.slice(read.offset, read.offset + read.first);
    const end = read.offset + page.length;
    return respond({
      data: {
        machines: {
          totalCount: null,
          pageInfo: {
            endCursor: page.length === 0 ? null : spellCursor(end),
            hasNextPage: end < matched.length,
          },
          edges: page.map((node, position) => ({
            cursor: spellCursor(read.offset + position + 1),
            node,
          })),
        },
      },
    });
  };
  return API_SCENARIOS.map((scenario) =>
    graphql
      .link(`*/graphql/${scenario}`)
      .query<MachinesData, Readonly<Record<string, unknown>>>(
        "MachinesQuery",
        ({ variables }) => answer(scenario, variables),
      ),
  );
}
