import type { SortDirection } from "../query/index.js";
import choosePlural from "./choosePlural.js";
import composeClause from "./composeClause.js";
import composeSentence from "./composeSentence.js";
import { DIRECTIONS, NOT_DONE, PENDING, STILL_APPLIES } from "./constants.js";
import spellOrdinal from "./spellOrdinal.js";
import type { DataViewsMessages } from "./types.js";

/** English's own grouping of numbers, so a large count reads as one. */
const NUMBERS = new Intl.NumberFormat("en");

/** A count as English writes it: grouped, never bare digits past a thousand. */
const formatCount = (value: number): string => NUMBERS.format(value);

/** One term as the ordering messages word it: "Name, descending". */
const formatSortTerm = (name: string, direction: SortDirection): string =>
  `${name}, ${DIRECTIONS[direction]}`;

/**
 * The words DataViews ships with: English. Plurals and ordinals are worded
 * through the platform's English rules, counts through its number format,
 * and every reason is stripped of the full stops it came with — those that
 * end a sentence of their own then take one, and those a message runs on
 * from take none.
 */
export const DEFAULT_MESSAGES: DataViewsMessages = Object.freeze({
  statusPending: "Loading…",
  statusRegrouping: "Regrouping…",
  statusFailed: (reason) =>
    `These rows could not be loaded: ${composeClause(reason)}`,
  statusRefreshFailed: (reason) =>
    `These rows could not be refreshed: ${composeClause(reason)}`,
  statusStale: (reason) =>
    `These rows do not match the current query: ${composeClause(reason)}`,
  statusNoResults: "No rows match this query.",
  statusNoData: "There is nothing here yet.",

  selectAllRows: "Select all displayed rows",
  selectRow: (name) => `Select ${name}`,
  columnWidth: (pixels) =>
    `${formatCount(pixels)} ${pixels === 1 ? "pixel" : "pixels"}`,

  sortPrecedence: (direction, position, total) =>
    total === 1
      ? DIRECTIONS[direction]
      : `${DIRECTIONS[direction]}, ${spellOrdinal(position)} of ${formatCount(total)}`,
  sortRefused: (reasons) => {
    // A reason that says nothing is dropped: better a plain statement than a
    // sentence built around a bare stop.
    const clauses = reasons
      .map(composeClause)
      .filter((clause) => clause !== "");
    return clauses.length === 0
      ? "Sort unchanged."
      : `Sort unchanged: ${clauses.join("; ")}.`;
  },
  sortApplied: (terms) =>
    `Sorted by ${terms
      .map(({ name, direction }) => formatSortTerm(name, direction))
      .join("; then ")}.`,
  sortDefaulted: (terms) =>
    `Sorted by the source's own order: ${terms
      .map(({ name, direction }) => formatSortTerm(name, direction))
      .join("; ")}.`,
  sortAbsent: "Not sorted: the source documents no order.",

  columnOptions: (name) => `Column options for ${name}`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  removeFromSort: "Remove from sort",
  hideColumn: "Hide column",
  moveColumnLeft: "Move column left",
  moveColumnRight: "Move column right",

  tableSettings: "Table settings",
  hideNamedColumn: (name) => `Hide ${name}`,
  showNamedColumn: (name) => `Show ${name}`,
  moveNamedColumnLeft: (name) => `Move ${name} left`,
  moveNamedColumnRight: (name) => `Move ${name} right`,
  columnAlwaysShown: (name) => `${name} is always shown`,
  resetTableSettings: "Reset table settings",

  columnHidden: (name) => `${name} hidden`,
  columnShown: (name, position, total) =>
    `${name} shown, position ${formatCount(position)} of ${formatCount(total)}`,
  columnMoved: (name, position, total) =>
    `${name} moved to position ${formatCount(position)} of ${formatCount(total)}`,
  tableSettingsReset: "Table settings reset",

  sortPanel: "Sort",
  sortTerm: formatSortTerm,
  moveSortTermUp: "Move up",
  moveSortTermDown: "Move down",
  removeSortTerm: "Remove",

  filters: "Filters",
  moreFilters: "More filters",
  submitFilters: "Apply filters",
  filterFrom: (label) => `${label} from`,
  filterTo: (label) => `${label} to`,
  filterLowest: (value) => `Lowest: ${value}`,
  filterHighest: (value) => `Highest: ${value}`,
  clearFilter: (name) => `Clear ${name}`,
  filterIsAnyOf: (label) => `${label} is any of`,
  filterIsNoneOf: (label) => `${label} is none of`,
  matchAnyInstead: "Match any of these instead",
  matchNoneInstead: "Match none of these instead",
  facetCount: (count) =>
    count.kind === "exact"
      ? formatCount(count.value)
      : `at least ${formatCount(count.value)}`,
  filterContains: (label) => `${label} contains`,
  filterStartsWith: (label) => `${label} starts with`,
  filterIncomplete: (retained) =>
    retained
      ? `Enter a value to change this restriction. ${STILL_APPLIES}`
      : "Enter a value to apply this restriction.",
  filterRefused: (reasons, retained) => {
    const sentences = reasons
      .filter((reason) => composeClause(reason) !== "")
      .map(composeSentence)
      .join(" ");
    if (sentences === "") {
      return retained ? STILL_APPLIES : "";
    }
    return retained ? `${sentences} ${STILL_APPLIES}` : sentences;
  },

  search: "Search",
  submitSearch: "Search",

  pagination: "Pagination",
  rowsPerPage: "Rows per page",
  submitPageSize: "Apply page size",
  rowsShown: (first, shown, total) => {
    const range =
      shown === 0
        ? "0"
        : `${formatCount(first)}–${formatCount(first + shown - 1)}`;
    if (total.kind === "unknown") {
      return shown === 1
        ? `Showing row ${formatCount(first)}`
        : `Showing ${range} rows`;
    }
    const counted = `${total.kind === "at-least" ? "at least " : ""}${formatCount(total.value)}`;
    return shown === 1
      ? `Showing row ${formatCount(first)} out of ${counted}`
      : `Showing ${range} out of ${counted} ${choosePlural(total.value, "row", "rows")}`;
  },
  page: "Page",
  pageCount: (pages) =>
    `of ${formatCount(pages)} ${choosePlural(pages, "page", "pages")}`,
  submitPage: "Go to page",
  goToFirstPage: "First page",
  goToPreviousPage: "Previous page",
  goToNextPage: "Next page",
  goToLastPage: "Last page",

  savedViews: "Saved views",
  viewsUnscripted:
    "Saved views need JavaScript. A link to a query still works.",
  view: "View",
  viewNone: "No saved view",
  viewModified: "Modified",
  saveView: "Save",
  overwriteView: "Overwrite",
  revertView: "Revert",
  discardViewChanges: "Discard changes",
  saveViewAs: "Save as…",
  renameView: "Rename…",
  deleteView: "Delete…",
  retryViews: "Try again",
  saveAsForm: "Save as a new view",
  submitSaveAs: "Save view",
  renameForm: (name) => `Rename "${name}"`,
  submitRename: "Rename",
  viewName: "Name",
  cancel: "Cancel",
  deleteForm: (name) => `Delete "${name}"? This cannot be undone.`,
  submitDelete: "Delete view",
  viewsPending: "Loading saved views…",
  viewsUnavailable: (reason) =>
    `Saved views are unavailable: ${composeClause(reason)}.`,
  viewsUnreadable: (count) =>
    `${formatCount(count)} saved ${choosePlural(count, "view", "views")} cannot be read.`,
  arrangementUnsaved: (reason) =>
    `The arrangement is not being saved: ${composeClause(reason)}.`,
  viewNameRefused: composeSentence,
  viewPending: (command) => PENDING[command],
  viewOpened: (name) => `Opened "${name}".`,
  viewSaved: (name) => `Saved "${name}".`,
  viewRenamed: (name) => `Renamed to "${name}".`,
  viewDeleted: "View deleted.",
  viewRefused: (name, reasons) =>
    `Not opened: "${name}" asks for what this collection cannot show — ${reasons
      .map(composeClause)
      .join("; ")}. The query is unchanged.`,
  viewConflicted: (command, name) => {
    switch (command) {
      case "save":
        return `Not saved: "${name}" was changed elsewhere. Overwrite it, save your changes as a new view, or discard them.`;
      case "save-as":
        return "Not saved: a different view is stored under the same identity. Try again.";
      default:
        return `${NOT_DONE[command]}: "${name}" was changed elsewhere. Its latest version is open; try again.`;
    }
  },
  viewMissing: (command) => `${NOT_DONE[command]}: the view no longer exists.`,
  viewUnreadable: (command, reason) =>
    `${NOT_DONE[command]}: the stored view cannot be read (${composeClause(reason)}).`,
  viewFailed: (command, reason) =>
    `${NOT_DONE[command]}: ${composeClause(reason)}.`,

  selectionActions: "Selection actions",
  rowsSelected: (count) => `${formatCount(count)} selected`,
  deselectRows: (count) =>
    `Deselect ${formatCount(count)} ${choosePlural(count, "row", "rows")}`,
});
