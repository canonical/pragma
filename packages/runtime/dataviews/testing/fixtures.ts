/**
 * Fixtures for tests: the identity every fixture record carries, a source
 * declaration that can execute nothing with a builder that overrides one
 * member of it, the page and answer a manual source is answered with, the
 * completions a request ends badly with, the counts a page claims, the
 * pagination kinds a source declares, a slice filtered one way, one display
 * status of each kind, and a stored saved view as a store lists it.
 * Kept in one place so a new capability member does not have to be spelled
 * into ninety test files.
 */

import { createCollection } from "../src/lib/collection/index.js";
import type { DisplayStatus } from "../src/lib/display/index.js";
import {
  EMPTY_SLICE,
  type PredicateOperand,
  type Slice,
} from "../src/lib/query/index.js";
import {
  type Completion,
  type Count,
  type PageCursors,
  type SourceCounts,
  type SourcePage,
  UNKNOWN_COUNT,
} from "../src/lib/result/index.js";

import type { RowRecord } from "../src/lib/rows/index.js";
import {
  declareCapabilities,
  type PaginationCapabilities,
  type SourceCapabilities,
  type SourceRequest,
} from "../src/lib/source/index.js";
import type { SavedView } from "../src/lib/views/index.js";

/** The identity every fixture record carries: its own `id`. */
export const byId = (row: RowRecord): string => String(row["id"]);

/**
 * A source declaring nothing executable: every request is refused. Built
 * the way a source builds its own, so the fixture and the refusing defaults
 * cannot drift apart; `declareCapabilities.test.ts` pins what they are.
 */
export const NOTHING_DECLARED: SourceCapabilities = declareCapabilities(
  createCollection({ fields: [], identify: byId }),
  {},
);

/** `NOTHING_DECLARED` with the named members replaced. */
export const declare = (
  overrides: Partial<SourceCapabilities>,
): SourceCapabilities => ({ ...NOTHING_DECLARED, ...overrides });

/** A sort block over the given fields, limited to `terms` (none by default) and undocumented. */
export const declareSort = (
  fields: readonly string[],
  terms: number | null = null,
): SourceCapabilities["sort"] => ({
  fields,
  terms,
  default: [],
  tiebreak: "opaque",
  empties: {},
  collation: null,
});

/** A page of the given rows with the exact counts a complete source reports. */
export const pageOf = <TRow extends object>(
  rows: readonly TRow[],
): SourcePage<TRow> => ({
  rows,
  groups: null,
  counts: {
    pageable: { kind: "exact", value: rows.length },
    matched: { kind: "exact", value: rows.length },
    total: { kind: "exact", value: rows.length },
  },
  more: null,
  cursors: null,
});

/** An answer of the given rows to every request, as a complete source gives. */
export const answering =
  <TRow extends object>(
    rows: readonly TRow[],
  ): ((request: SourceRequest) => SourcePage<TRow>) =>
  () =>
    pageOf(rows);

/** A request the source accepted and could not complete. */
export const failedWith = <TRow extends object>(
  reason: string,
): Extract<Completion<TRow>, { readonly status: "failed" }> => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** A request the source run refused before executing it, once per reason. */
export const refusedWith = <TRow extends object>(
  ...reasons: readonly string[]
): Extract<Completion<TRow>, { readonly status: "refused" }> => ({
  status: "refused",
  refusals: reasons.map((reason) => ({
    part: "sort",
    code: "undeclared-field",
    field: "name",
    operator: null,
    reason,
  })),
});

/** A count claimed exactly. */
export const exactly = (value: number): Count => ({ kind: "exact", value });

/** A count claimed as a lower bound. */
export const atLeast = (value: number): Count => ({ kind: "at-least", value });

/** Counts where only `pageable` — the one a bar pages over — is claimed. */
const countingPageable = (pageable: Count): SourceCounts => ({
  pageable,
  matched: UNKNOWN_COUNT,
  total: UNKNOWN_COUNT,
});

/** An offset source: any page is reachable by number. */
export const BY_NUMBER: PaginationCapabilities = Object.freeze({
  kind: "offset",
});

/** A forward cursor source: pages are reached only through its tokens. */
export const FORWARD_CURSORS: PaginationCapabilities = Object.freeze({
  kind: "cursor",
  backward: false,
  durable: false,
});

/** The row a settled page carries: an identity and nothing else. */
export type SettledRow = { readonly id: string };

/** A page of `rows` records, counted and continued as the settled fields say. */
export const buildSettledPage = ({
  rows,
  pageable = UNKNOWN_COUNT,
  more = null,
  cursors = null,
}: {
  readonly rows: number;
  /** What the source counts; nothing by default. */
  readonly pageable?: Count;
  /** The source's own word on a further page. */
  readonly more?: boolean | null;
  /** The tokens the page handed back; none for an offset source. */
  readonly cursors?: PageCursors | null;
}): SourcePage<SettledRow> => ({
  rows: Array.from({ length: rows }, (_unused, at) => ({ id: `m${at}` })),
  groups: null,
  counts: countingPageable(pageable),
  more,
  cursors,
});

/** The request a command issued, failing loudly rather than casting. */
export const readIssuedRequest = (requestId: string | null): string => {
  if (requestId === null) {
    throw new Error("expected the command to issue a request");
  }
  return requestId;
};

/** A slice filtering `status` to these operands and nothing else. */
export const filterStatusBy = (
  operands: readonly PredicateOperand[],
): Slice => ({
  ...EMPTY_SLICE,
  filter: [{ field: "status", operator: "eq", operands }],
});

/** One display status of each kind, with a reason where the kind carries one. */
export const displayStatusOf = (
  status: DisplayStatus["status"],
): DisplayStatus =>
  status === "failed" || status === "refresh-failed" || status === "stale"
    ? { status, reason: "offline" }
    : { status };

/** One stored view, as a store would list it, with the given fields changed. */
export const buildStoredView = (
  overrides: Partial<SavedView> = {},
): SavedView => ({
  id: "v1",
  name: "Failed",
  query: "as=table&status=failed",
  presentation: {},
  revision: 1,
  pinned: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
  ...overrides,
});
