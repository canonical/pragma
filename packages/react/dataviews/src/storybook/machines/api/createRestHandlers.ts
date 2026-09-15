import { delay, HttpResponse, http, type RequestHandler } from "msw";
import { machines } from "../fixtures.js";
import compileLikePattern from "./compileLikePattern.js";
import { API_SCENARIOS } from "./constants.js";
import foldStoredText from "./foldStoredText.js";
import readRestQuery from "./readRestQuery.js";
import selectRecords from "./selectRecords.js";
import spellLikePattern from "./spellLikePattern.js";
import type {
  ApiProblem,
  ApiRecord,
  ApiScenario,
  ApiTextMatch,
  MockApiConfig,
} from "./types.js";

/** One page the REST endpoint answers with. */
type RestPage = {
  readonly items: readonly ApiRecord[];
  /** Records matching the query. */
  readonly matched: number;
  /** Records the endpoint serves, whatever the query. */
  readonly total: number;
};

/**
 * Whether a value holds text, as a SQL backend answers it: the operand
 * escaped into a `LIKE` pattern and compiled once per query, and both sides
 * folded, as `lower(value) LIKE lower(pattern) ESCAPE '\'` compares them.
 */
const matchText = (operator: ApiTextMatch["operator"], text: string) => {
  const matches = compileLikePattern(
    foldStoredText(spellLikePattern(operator, text)),
  );
  return (value: string): boolean => matches(foldStoredText(value));
};

/** A problem answer, with the status an HTTP backend sends it with. */
const respondWithProblem = (status: number, reason: string) =>
  HttpResponse.json<ApiProblem>({ reason }, { status });

/**
 * The REST machine endpoint, `GET /api/<scenario>/machines`, once for every
 * scenario: it reads the flat query grammar as its own parameters, filters
 * statuses with `IN` and `NOT IN` and text with `LIKE`, orders by one term,
 * pages by number and counts exactly.
 *
 * Each handler is stateless: what a request is answered with depends on its
 * path and its parameters alone, so handlers never carry anything from one
 * story or test to the next.
 *
 * @note Impure: its handlers wait on timers before they answer.
 */
export default function createRestHandlers({
  records = machines,
  latency = 0,
}: MockApiConfig = {}): readonly RequestHandler[] {
  const answer = async (scenario: ApiScenario, url: URL): Promise<Response> => {
    if (scenario === "unanswered") {
      await delay("infinite");
    }
    await delay(latency);
    if (scenario === "down") {
      return respondWithProblem(503, "the machine inventory is unavailable");
    }
    const read = readRestQuery(url.searchParams);
    if ("reason" in read) {
      return respondWithProblem(400, read.reason);
    }
    if (scenario === "first-page-only" && read.page > 1) {
      return respondWithProblem(
        503,
        "the machines past the first page are unavailable",
      );
    }
    const matched = selectRecords(records, read.query, matchText);
    const start = (read.page - 1) * read.size;
    return HttpResponse.json<RestPage>({
      items: matched.slice(start, start + read.size),
      matched: matched.length,
      total: records.length,
    });
  };
  return API_SCENARIOS.map((scenario) =>
    http.get(`*/api/${scenario}/machines`, ({ request }) =>
      answer(scenario, new URL(request.url)),
    ),
  );
}
