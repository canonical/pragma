/**
 * Delivery fixtures for tests: one exact count, one page and one delivered
 * page, the shapes a test hands a manual source when it answers a request
 * by hand. A source's declaration is built the way an application builds
 * one, with `declareCapabilities` against the test's own collection;
 * `COUNTED_EXACTLY` is the counts block complete local input declares; one
 * display status of each kind, for the parts that render one; and a stored
 * view as a store lists it, spelled as the core fixtures spell theirs; the
 * Filters stories the story harnesses play and check; the operator and
 * facet case tables every executor runs; and the mark and the samples every
 * worded message is called with, which the English sweep reads a message's
 * own words from.
 */

import type { DataViewsMessages } from "@canonical/dataviews-core";
import {
  type Completion,
  type Count,
  type CountCapabilities,
  createPage,
  type DisplayStatus,
  type SavedView,
  type SourcePage,
} from "@canonical/dataviews-core";
import type {
  FacetCase,
  FacetRecord,
  OperatorCase,
  OperatorRecord,
} from "./types.js";

/** All three counts answered exactly, as complete local input answers them. */
export const COUNTED_EXACTLY: CountCapabilities = Object.freeze({
  pageable: "exact",
  matched: "exact",
  total: "exact",
});

/** One count a source claims exactly. */
export const countExactly = (value: number): Count => ({
  kind: "exact",
  value,
});

/** A page of rows, counted exactly and grouped by nothing. */
export const pageOf = <TRow extends object>(
  rows: readonly TRow[],
): SourcePage<TRow> =>
  createPage({ rows, matched: rows.length, total: rows.length });

/** A delivered page of rows, counted exactly and grouped by nothing. */
export const deliverRows = <TRow extends object>(
  rows: readonly TRow[],
): Completion<TRow> => ({
  status: "succeeded",
  page: pageOf(rows),
});

/** One display status of each kind, with a reason where the kind carries one. */
export const displayStatusOf = (
  status: DisplayStatus["status"],
): DisplayStatus =>
  status === "failed" || status === "refresh-failed" || status === "stale"
    ? { status, reason: "offline" }
    : { status };

/**
 * One stored view as a store lists it — first revision, unpinned, stamped
 * at a fixed instant — with any field overridden. The same builder, by the
 * same name, as the core package's testing fixtures.
 */
export const buildStoredView = (
  overrides: Partial<SavedView> = {},
): SavedView => ({
  id: "v1",
  name: "Failed",
  query: "status=failed",
  presentation: {},
  revision: 1,
  pinned: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
  ...overrides,
});

/**
 * The URL a server render and the hydration over it answer: running
 * machines ordered by cores, the second page of fifty.
 */
export const SERVER_RENDER_HREF =
  "/machines?status=running&sort=cores__desc&page=2&size=50";

/** The Filters stories drawing facets, primary fields and the none-of set. */
export const FACETED_FILTER_STORIES: ReadonlySet<string> = new Set([
  "CountsBesideOptions",
  "NoneOfApplied",
  "PrimaryFilters",
]);

/**
 * What each filter operator means, as fixtures every executor runs: the
 * local array source, and each mock endpoint the stories stand in for. One
 * table, so a source cannot claim an operator and mean something else by it.
 *
 * The rules the cases pin:
 *
 * - `contains` and `startsWith` look at a string value once it and the
 *   operand are folded — normalised to NFC, lowercased without a locale,
 *   final sigma read as sigma, and normalised to NFC again — for the operand
 *   anywhere in the value, or at its start. The operand is literal — `%`,
 *   `_`, `\` and `.` are characters to look for, never a pattern, which a
 *   backend matching with `LIKE` must escape — and nothing is trimmed. A
 *   letter is never expanded into another spelling of it, so `ß` holds no
 *   `ss`, and an accented letter is not its base letter.
 * - `isAny` holds a choice value — a string or a number — that is one of
 *   the operands; `isNone` one that is none of them, a value the options do
 *   not list included.
 * - No operator matches a value that is absent, null or of another type;
 *   an empty string is a value, none of the options.
 *
 * Evidence over this corpus only: passing it does not prove an executor
 * right for every value.
 */

/** The records every case looks through. */
export const OPERATOR_RECORDS: readonly OperatorRecord[] = [
  { id: "web-lower", name: "web-01.example.com", status: "running" },
  { id: "web-upper", name: "WEB-02.EXAMPLE.COM", status: "failed" },
  { id: "api", name: "api.example.com", status: "pending" },
  { id: "percent", name: "50% full", status: "decommissioned" },
  { id: "digits", name: "5050 full", status: 42 },
  { id: "underscore", name: "disk_a", status: null },
  { id: "any-character", name: "diskXa", status: true },
  { id: "backslash", name: "back\\slash", status: "failed" },
  { id: "composed", name: "École" },
  { id: "decomposed", name: "e\u0301cole normale" },
  { id: "sharp-s", name: "Straße" },
  { id: "cjk", name: "日本語テキスト" },
  { id: "greek", name: "ΟΔΟΣΤΡΩΜΑ" },
  { id: "t-diaeresis", name: "T̈" },
  { id: "deseret", name: "\u{10400}" },
  { id: "padded", name: "  padded  " },
  { id: "empty", name: "", status: "" },
  { id: "number", name: 42 },
  { id: "null", name: null },
  { id: "absent" },
];

/** Every operand the table asks for, with what holds it. */
export const OPERATOR_CASES: readonly OperatorCase[] = [
  {
    operator: "contains",
    operands: ["web"],
    matches: ["web-lower", "web-upper"],
    pins: "ASCII case folds",
  },
  {
    operator: "contains",
    operands: ["WEB-0"],
    matches: ["web-lower", "web-upper"],
    pins: "an uppercase operand folds too",
  },
  {
    operator: "contains",
    operands: ["example.com"],
    matches: ["web-lower", "web-upper", "api"],
    pins: "a substring anywhere in the value",
  },
  {
    operator: "contains",
    operands: ["."],
    matches: ["web-lower", "web-upper", "api"],
    pins: "a dot is a dot, never any character",
  },
  {
    operator: "contains",
    operands: ["50%"],
    matches: ["percent"],
    pins: "a percent sign is literal, never a run of characters",
  },
  {
    operator: "contains",
    operands: ["%"],
    matches: ["percent"],
    pins: "a lone percent sign matches only itself",
  },
  {
    operator: "contains",
    operands: ["k_a"],
    matches: ["underscore"],
    pins: "an underscore is literal, never one character",
  },
  {
    operator: "contains",
    operands: ["\\"],
    matches: ["backslash"],
    pins: "the escape character is literal",
  },
  {
    operator: "contains",
    operands: ["école"],
    matches: ["composed", "decomposed"],
    pins: "non-ASCII case folds, composed or not",
  },
  {
    operator: "contains",
    operands: ["E\u0301COLE"],
    matches: ["composed", "decomposed"],
    pins: "a decomposed uppercase operand finds composed text",
  },
  {
    operator: "contains",
    operands: ["straße"],
    matches: ["sharp-s"],
    pins: "a sharp s holds itself",
  },
  {
    operator: "contains",
    operands: ["strasse"],
    matches: [],
    pins: "a letter is never expanded into another spelling",
  },
  {
    operator: "contains",
    operands: ["本語"],
    matches: ["cjk"],
    pins: "text without case is matched exactly",
  },
  {
    operator: "contains",
    operands: ["ΟΔΟΣ"],
    matches: ["greek"],
    pins: "a word ending in capital sigma is found inside a longer word",
  },
  {
    operator: "contains",
    operands: ["σ"],
    matches: ["greek"],
    pins: "a capital sigma holds a lowercase sigma wherever it falls",
  },
  {
    operator: "contains",
    operands: ["ẗ"],
    matches: ["t-diaeresis"],
    pins: "a lowercase letter composes where its uppercase could not",
  },
  {
    operator: "contains",
    operands: ["\u{10428}"],
    matches: ["deseret"],
    pins: "case folds beyond the basic plane",
  },
  {
    operator: "contains",
    operands: ["  "],
    matches: ["padded"],
    pins: "spaces are looked for, never trimmed",
  },
  {
    operator: "contains",
    operands: ["42"],
    matches: [],
    pins: "a number is not text, so holds none",
  },
  {
    operator: "contains",
    operands: ["null"],
    matches: [],
    pins: "a null value holds nothing, not even its own spelling",
  },
  {
    operator: "contains",
    operands: ["undefined"],
    matches: [],
    pins: "an absent value holds nothing, not even its own spelling",
  },
  {
    operator: "startsWith",
    operands: ["web"],
    matches: ["web-lower", "web-upper"],
    pins: "a value starts with the operand, ASCII case folded",
  },
  {
    operator: "startsWith",
    operands: ["WEB-0"],
    matches: ["web-lower", "web-upper"],
    pins: "an uppercase operand folds at the start too",
  },
  {
    operator: "startsWith",
    operands: ["example"],
    matches: [],
    pins: "text inside the value is not at its start",
  },
  {
    operator: "startsWith",
    operands: ["%"],
    matches: [],
    pins: "a leading percent sign is literal, never a run of characters",
  },
  {
    operator: "startsWith",
    operands: ["50%"],
    matches: ["percent"],
    pins: "a percent sign after the start is literal too",
  },
  {
    operator: "startsWith",
    operands: ["disk_"],
    matches: ["underscore"],
    pins: "an underscore is literal, never one character",
  },
  {
    operator: "startsWith",
    operands: ["back\\"],
    matches: ["backslash"],
    pins: "the escape character is literal",
  },
  {
    operator: "startsWith",
    operands: ["E\u0301COLE"],
    matches: ["composed", "decomposed"],
    pins: "non-ASCII case folds at the start, composed or not",
  },
  {
    operator: "startsWith",
    operands: ["e"],
    matches: [],
    pins: "an accented letter is not its base letter",
  },
  {
    operator: "startsWith",
    operands: ["ΟΔΟΣ"],
    matches: ["greek"],
    pins: "a word ending in capital sigma starts a longer word",
  },
  {
    operator: "startsWith",
    operands: ["日本"],
    matches: ["cjk"],
    pins: "text without case is matched exactly at the start",
  },
  {
    operator: "startsWith",
    operands: ["  "],
    matches: ["padded"],
    pins: "leading spaces are looked for, never trimmed",
  },
  {
    operator: "startsWith",
    operands: ["4"],
    matches: [],
    pins: "a number is not text, so starts with none",
  },
  {
    operator: "isAny",
    operands: ["failed"],
    matches: ["web-upper", "backslash"],
    pins: "a value equal to the one operand",
  },
  {
    operator: "isAny",
    operands: ["running", "pending"],
    matches: ["web-lower", "api"],
    pins: "a value equal to any of the operands",
  },
  {
    operator: "isAny",
    operands: ["running", "failed", "pending"],
    matches: ["web-lower", "web-upper", "api", "backslash"],
    pins: "no value the options do not list, and no empty value",
  },
  {
    operator: "isNone",
    operands: ["failed"],
    matches: ["web-lower", "api", "percent", "digits", "empty"],
    pins: "a present value that is not the operand, unlisted ones included",
  },
  {
    operator: "isNone",
    operands: ["running", "failed", "pending"],
    matches: ["percent", "digits", "empty"],
    pins: "a value the options do not list is none of them",
  },
];

/**
 * What a facet means, as fixtures every executor runs: the local array
 * source, and each mock endpoint the stories stand in for. One table, so a
 * source cannot claim facets and compute them over something else.
 *
 * The rules the cases pin:
 *
 * - A facet is computed over every record the query matches, never a page.
 * - A field's own predicates are lifted when its facet is computed: the
 *   status facet ignores the statuses the query is any or none of, and the
 *   cores facet ignores its bounds, while every other predicate and the
 *   search still apply. So the other options keep their counts and a bound
 *   can widen past itself.
 * - A status facet lists each status a matching record holds — a string or
 *   a number, never null, absent or another type — with how many hold it, in
 *   the collection's option order, then any other status by code unit; a
 *   status no record holds is not listed.
 * - A cores facet is the least and greatest finite number of cores, null
 *   while no matching record holds one.
 *
 * Evidence over this corpus only: passing it does not prove an executor
 * right for every record set.
 */

/** The records every case computes over. */
export const FACET_RECORDS: readonly FacetRecord[] = [
  { id: "alder", name: "alder", status: "running", cores: 4 },
  { id: "birch", name: "birch", status: "failed", cores: 16 },
  { id: "cedar", name: "cedar", status: "failed", cores: 8 },
  { id: "dogwood", name: "dogwood", status: "pending", cores: 2 },
  { id: "elm", name: "elm", status: "decommissioned", cores: 32 },
  { id: "fir", name: "fir", status: 42, cores: "12" },
  { id: "gum", name: "gum", status: null, cores: null },
  { id: "hazel", name: "hazel", status: true },
  { id: "ironwood", name: "ironwood", cores: 64 },
];

/** Every query the table asks, with the facets it answers. */
export const FACET_CASES: readonly FacetCase[] = [
  {
    query: {},
    status: [
      ["running", 1],
      ["failed", 2],
      ["pending", 1],
      [42, 1],
      ["decommissioned", 1],
    ],
    cores: [2, 64],
    pins: "every status held, options first then others by code unit, and every finite core count",
  },
  {
    query: { isAny: ["failed"] },
    status: [
      ["running", 1],
      ["failed", 2],
      ["pending", 1],
      [42, 1],
      ["decommissioned", 1],
    ],
    cores: [8, 16],
    pins: "a status restriction is lifted from its own facet, and narrows the cores",
  },
  {
    query: { gte: 8 },
    status: [
      ["failed", 2],
      ["decommissioned", 1],
    ],
    cores: [2, 64],
    pins: "a bound narrows the statuses, and is lifted from its own range",
  },
  {
    query: { isNone: ["failed"], lte: 16 },
    status: [
      ["running", 1],
      ["failed", 2],
      ["pending", 1],
    ],
    cores: [2, 32],
    pins: "none-of is lifted from its own facet, and narrows the cores to present statuses",
  },
  {
    query: { search: "ED" },
    status: [["failed", 1]],
    cores: [8, 8],
    pins: "the search applies to every facet",
  },
  {
    query: { search: "ED", isAny: ["running"] },
    status: [["failed", 1]],
    cores: [null, null],
    pins: "the search applies where a status restriction is lifted, and with it narrows the cores",
  },
  {
    query: { search: "ED", gte: 10 },
    status: [],
    cores: [8, 8],
    pins: "the search applies where a bound is lifted, and with it narrows the statuses",
  },
  {
    query: { search: "no such machine" },
    status: [],
    cores: [null, null],
    pins: "nothing matching lists no status and bounds nothing",
  },
];

/**
 * What stands for a name or a reason in the sample arguments below: a
 * character no message's own words contain, so what a message says around
 * it can be told from what it was handed.
 */
export const MESSAGE_MARK = "\u0001";

/**
 * Arguments to call every worded message with, each set reaching another of
 * its wordings — a singular and a plural, each direction, each command — and
 * null for a message that is text. Keyed by every message, so a message the
 * record gains is a compile error here until it has samples, and the English
 * it adds is looked for.
 */
export const MESSAGE_SAMPLES: {
  readonly [TKey in keyof DataViewsMessages]: DataViewsMessages[TKey] extends (
    ...args: infer TArgs
  ) => string
    ? readonly TArgs[]
    : null;
} = {
  statusPending: null,
  statusRegrouping: null,
  statusFailed: [[MESSAGE_MARK]],
  statusRefreshFailed: [[MESSAGE_MARK]],
  statusStale: [[MESSAGE_MARK]],
  statusNoResults: null,
  statusNoData: null,
  selectAllRows: null,
  selectRow: [[MESSAGE_MARK]],
  columnWidth: [[1], [7]],
  sortPrecedence: [
    ["asc", 1, 1],
    ["desc", 2, 3],
  ],
  sortRefused: [[[MESSAGE_MARK]]],
  sortApplied: [
    [
      [
        { name: MESSAGE_MARK, direction: "asc" },
        { name: MESSAGE_MARK, direction: "desc" },
      ],
    ],
  ],
  sortDefaulted: [
    [
      [
        { name: MESSAGE_MARK, direction: "asc" },
        { name: MESSAGE_MARK, direction: "desc" },
      ],
    ],
  ],
  sortAbsent: null,
  columnOptions: [[MESSAGE_MARK]],
  sortAscending: null,
  sortDescending: null,
  removeFromSort: null,
  hideColumn: null,
  moveColumnLeft: null,
  moveColumnRight: null,
  tableSettings: null,
  hideNamedColumn: [[MESSAGE_MARK]],
  showNamedColumn: [[MESSAGE_MARK]],
  moveNamedColumnLeft: [[MESSAGE_MARK]],
  moveNamedColumnRight: [[MESSAGE_MARK]],
  columnAlwaysShown: [[MESSAGE_MARK]],
  resetTableSettings: null,
  columnHidden: [[MESSAGE_MARK]],
  columnShown: [[MESSAGE_MARK, 2, 3]],
  columnMoved: [[MESSAGE_MARK, 2, 3]],
  tableSettingsReset: null,
  sortPanel: null,
  sortTerm: [
    [MESSAGE_MARK, "asc"],
    [MESSAGE_MARK, "desc"],
  ],
  moveSortTermUp: null,
  moveSortTermDown: null,
  removeSortTerm: null,
  filters: null,
  moreFilters: null,
  submitFilters: null,
  filterFrom: [[MESSAGE_MARK]],
  filterTo: [[MESSAGE_MARK]],
  filterLowest: [[MESSAGE_MARK]],
  filterHighest: [[MESSAGE_MARK]],
  clearFilter: [[MESSAGE_MARK]],
  filterIsAnyOf: [[MESSAGE_MARK]],
  filterIsNoneOf: [[MESSAGE_MARK]],
  matchAnyInstead: null,
  matchNoneInstead: null,
  facetCount: [[{ kind: "exact", value: 7 }], [{ kind: "at-least", value: 7 }]],
  filterContains: [[MESSAGE_MARK]],
  filterStartsWith: [[MESSAGE_MARK]],
  filterIncomplete: [[false], [true]],
  filterRefused: [
    [[MESSAGE_MARK], false],
    [[MESSAGE_MARK, MESSAGE_MARK], true],
  ],
  search: null,
  submitSearch: null,
  pagination: null,
  rowsPerPage: null,
  submitPageSize: null,
  rowsShown: [
    [1, 1, { kind: "exact", value: 7 }],
    [1, 7, { kind: "at-least", value: 7 }],
    [1, 0, { kind: "unknown" }],
    [1, 1, { kind: "unknown" }],
  ],
  page: null,
  pageCount: [[1], [7]],
  submitPage: null,
  goToFirstPage: null,
  goToPreviousPage: null,
  goToNextPage: null,
  goToLastPage: null,
  savedViews: null,
  viewsUnscripted: null,
  view: null,
  viewNone: null,
  viewModified: null,
  saveView: null,
  overwriteView: null,
  revertView: null,
  discardViewChanges: null,
  saveViewAs: null,
  renameView: null,
  deleteView: null,
  retryViews: null,
  saveAsForm: null,
  submitSaveAs: null,
  renameForm: [[MESSAGE_MARK]],
  submitRename: null,
  viewName: null,
  cancel: null,
  deleteForm: [[MESSAGE_MARK]],
  submitDelete: null,
  viewsPending: null,
  viewsUnavailable: [[MESSAGE_MARK]],
  viewsUnreadable: [[1], [7]],
  arrangementUnsaved: [[MESSAGE_MARK]],
  viewNameRefused: [[MESSAGE_MARK]],
  viewPending: [["open"], ["save"], ["save-as"], ["rename"], ["remove"]],
  viewOpened: [[MESSAGE_MARK]],
  viewSaved: [[MESSAGE_MARK]],
  viewRenamed: [[MESSAGE_MARK]],
  viewDeleted: null,
  viewRefused: [[MESSAGE_MARK, [MESSAGE_MARK]]],
  viewConflicted: [
    ["open", MESSAGE_MARK],
    ["save", MESSAGE_MARK],
    ["save-as", MESSAGE_MARK],
    ["rename", MESSAGE_MARK],
    ["remove", MESSAGE_MARK],
  ],
  viewMissing: [["open"], ["save"], ["save-as"], ["rename"], ["remove"]],
  viewUnreadable: [
    ["open", MESSAGE_MARK],
    ["save", MESSAGE_MARK],
    ["rename", MESSAGE_MARK],
    ["remove", MESSAGE_MARK],
  ],
  viewFailed: [
    ["open", MESSAGE_MARK],
    ["save", MESSAGE_MARK],
    ["rename", MESSAGE_MARK],
    ["remove", MESSAGE_MARK],
  ],
  selectionActions: null,
  rowsSelected: [[7]],
  deselectRows: [[1], [7]],
  renderer: null,
};
