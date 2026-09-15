/**
 * The mock machine API's own vocabulary: the records it serves, how a set
 * of handlers is configured, the scenarios a request can ask for by its
 * path, and the answers each endpoint sends.
 */

import type { API_SCENARIOS } from "./constants.js";

/** One record the API serves: an identity, and fields read defensively. */
export type ApiRecord = { readonly id: string } & Readonly<
  Record<string, unknown>
>;

/**
 * How the endpoint behaves, chosen by the path a request is sent to, so
 * every scenario is served at once and no request's answer depends on
 * another's: `live` answers, `unanswered` never does, `down` fails every
 * request, and `first-page-only` fails every request past the first page.
 */
export type ApiScenario = (typeof API_SCENARIOS)[number];

/** How one set of handlers is built. */
export type MockApiConfig = {
  /** The records served; the story machines by default. */
  readonly records?: readonly ApiRecord[] | undefined;
  /** Milliseconds every answer waits before it is sent; none by default. */
  readonly latency?: number | undefined;
};

/** What one text field's value must contain or start with. */
export type ApiTextMatch = {
  readonly field: string;
  readonly operator: "contains" | "startsWith";
  readonly text: string;
};

/** The query one request asks, as the endpoint reads it. */
export type ApiQuery = {
  /** The text each text field's value must contain or start with. */
  readonly text: readonly ApiTextMatch[];
  /**
   * The statuses a record must have one of, and those it must have none of;
   * each empty for no restriction.
   */
  readonly statuses: {
    readonly isAny: readonly string[];
    readonly isNone: readonly string[];
  };
  /** The inclusive bounds on cores. */
  readonly cores: { readonly gte: number | null; readonly lte: number | null };
  /** Free text looked for in the searched fields, or null. */
  readonly search: string | null;
  /** The one ordered term, or null for the endpoint's own order. */
  readonly sort: {
    readonly field: string;
    readonly direction: "asc" | "desc";
  } | null;
};

/** The data the GraphQL `MachinesQuery` answers with: a forward connection. */
export type MachinesData = {
  readonly machines: {
    /** Null: the endpoint does not count what a query matches. */
    readonly totalCount: number | null;
    readonly pageInfo: {
      readonly endCursor: string | null;
      readonly hasNextPage: boolean;
    };
    readonly edges: readonly {
      readonly cursor: string;
      readonly node: ApiRecord;
    }[];
  };
};

/** Why a request cannot be run, as either endpoint's reader returns it. */
export type ApiProblem = {
  readonly reason: string;
};
