/**
 * Fixtures for tests: the identity every fixture record carries, a source
 * declaration that can execute nothing with a builder that overrides one
 * member of it, and the page and answer a manual source is answered with.
 * Kept in one place so a new capability member does not have to be spelled
 * into ninety test files.
 */

import { createCollection } from "../src/lib/collection/index.js";
import type { SourcePage } from "../src/lib/result/index.js";
import type { RowRecord } from "../src/lib/rows/index.js";
import {
  declareCapabilities,
  type SourceCapabilities,
  type SourceRequest,
} from "../src/lib/source/index.js";

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
