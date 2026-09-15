/**
 * What the mock machine API shares across its modules: its scenarios, the
 * fields either endpoint orders by, the order it lists statuses in, and the
 * one query the GraphQL endpoint answers.
 */

/** Every scenario, each served under a path of its own. */
export const API_SCENARIOS = [
  "live",
  "unanswered",
  "down",
  "first-page-only",
] as const;

/** The fields either endpoint orders by. */
export const SORTED_FIELDS: readonly string[] = [
  "name",
  "status",
  "cores",
  "region",
  "owner",
];

/** The statuses, in the order either endpoint sorts them. */
export const STATUS_ORDER: readonly string[] = ["running", "failed", "pending"];

/** The variables the one query the GraphQL endpoint answers declares. */
export const MACHINES_QUERY_VARIABLES: readonly string[] = [
  "first",
  "after",
  "where",
  "orderBy",
];

/** The one query the GraphQL endpoint answers, as a client sends it. */
export const MACHINES_QUERY_TEXT = `query MachinesQuery($first: Int!, $after: String, $where: MachineWhere, $orderBy: [MachineOrder!]) {
  machines(first: $first, after: $after, where: $where, orderBy: $orderBy) {
    totalCount
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      cursor
      node {
        id
        name
        status
        cores
        region
        owner
      }
    }
  }
}`;
