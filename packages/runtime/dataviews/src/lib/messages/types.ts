/**
 * The words DataViews says, as one record an application may replace: every
 * status, summary, control name, announcement and hint a part renders or
 * announces, and the shapes its worded messages are handed.
 *
 * Together because a message and the facts it is worded from are read as
 * one contract: a translation writes every member against these shapes.
 */

import type { SortDirection } from "../query/index.js";
import type { Count } from "../result/index.js";
import type { ViewCommand } from "../views/index.js";

/**
 * One term of an ordering, as a message words it: its name and direction.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SortTermWords = {
  /** The name the term is shown by: its column's heading, or its field. */
  readonly name: string;
  readonly direction: SortDirection;
};

/**
 * A count a facet reports beside the value it counts: exact, or a lower
 * bound. A count of nothing is not worded, so the unknown kind is not here.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FacetCountWords = Exclude<Count, { readonly kind: "unknown" }>;

/**
 * Every user-facing string DataViews renders or announces. It ships in
 * English; an application replaces it whole or in part through the root's
 * `messages`, and a part that is its own root — a standalone `DataTable` or
 * `PaginationBar` — takes `messages` itself.
 *
 * Field and option labels are not here: they name the application's data,
 * not the library's words.
 *
 * Annotating a whole replacement with this type makes a missing message a
 * compile error; the root takes any part of it and keeps English for the
 * rest.
 *
 * **How a key is named.** A key is a message id, spelled the same whether
 * the message is text or a function of the facts it states:
 * - a place or a control the reader lands on is its subject as a noun —
 *   `search`, `pagination`, `tableSettings`, `columnOptions`;
 * - a command is the verb and what it acts on, which may be an adverb
 *   where the control has no object — `hideColumn`, `clearFilter`,
 *   `goToNextPage`, `removeSortTerm`, `sortAscending`, `matchAnyInstead`,
 *   `cancel`;
 * - the same command worded with the thing it names takes `Named` —
 *   `hideColumn` on a column's own menu, `hideNamedColumn` in a list of
 *   every column;
 * - a form's submit is `submit…` — `submitSearch`, `submitFilters`;
 * - a form or the question it asks is `…Form` — `renameForm`, `deleteForm`;
 * - an outcome or a state is its subject and its condition, whether that
 *   is what happened to it or what it stands at — `columnHidden`,
 *   `sortApplied`, `viewConflicted`, `statusFailed`, `sortAbsent`,
 *   `viewNone`, `statusNoResults`;
 * - a control whose label is a phrase is worded as the phrase reads —
 *   `filterContains`, `filterIsAnyOf`;
 * - a hint or a description names what it describes — `sortPrecedence`,
 *   `filterLowest`, `pageCount`.
 *
 * **How a message is handed its facts.** One fact per argument, the subject
 * first and, where a message is about a saved-view command, the command
 * first. An object is passed only where the core already has that record —
 * a `Count` — and a list of like facts is passed as an array. A name a
 * message is handed is placed where the message puts it and never altered,
 * since it may stand for a column heading drawn as more than text. Plurals
 * and ordinals are the message's own to word, as the English record words
 * them through the platform's English rules.
 *
 * Message keys are noun phrases rather than verbs, against the standard for
 * function names: a message is named for what it says, and the name must
 * not change when a message stops being text and becomes a function of one
 * fact. Recorded as a deviation.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsMessages = {
  // The table's status row.
  /** A first page is on its way. */
  readonly statusPending: string;
  /** Rows are withheld while a grouping is applied. */
  readonly statusRegrouping: string;
  /** No rows could be loaded, and why. */
  readonly statusFailed: (reason: string) => string;
  /** The rows shown could not be refreshed, and why. */
  readonly statusRefreshFailed: (reason: string) => string;
  /** The rows shown answer an earlier query, and why. */
  readonly statusStale: (reason: string) => string;
  /** The query matches no row. */
  readonly statusNoResults: string;
  /** The collection holds no row at all. */
  readonly statusNoData: string;

  // The table's selection and resize controls.
  /** The select-all checkbox, whose scope is the rows displayed. */
  readonly selectAllRows: string;
  /** One row's checkbox, by the row's name. */
  readonly selectRow: (name: string) => string;
  /** A resize handle's value: the column's width in pixels. */
  readonly columnWidth: (pixels: number) => string;

  // The table's sort.
  /**
   * What a sorted heading states of its column: its direction, and its
   * precedence once the ordering has more than one term.
   */
  readonly sortPrecedence: (
    direction: SortDirection,
    position: number,
    total: number,
  ) => string;
  /**
   * Why an activation of a heading changed no ordering: every reason the
   * source gave, as `filterRefused` takes them.
   */
  readonly sortRefused: (reasons: readonly string[]) => string;
  /** The ordering the reader now states, announced once it applies. */
  readonly sortApplied: (terms: readonly SortTermWords[]) => string;
  /** The source's own ordering, which orders the rows while the reader states none. */
  readonly sortDefaulted: (terms: readonly SortTermWords[]) => string;
  /** No ordering stands, and the source documents none. */
  readonly sortAbsent: string;

  // A column's header menu.
  /** The header menu's button and menu, by the column's name. */
  readonly columnOptions: (name: string) => string;
  readonly sortAscending: string;
  readonly sortDescending: string;
  readonly removeFromSort: string;
  readonly hideColumn: string;
  readonly moveColumnLeft: string;
  readonly moveColumnRight: string;

  // The table's settings menu.
  /** The settings menu's button and menu. */
  readonly tableSettings: string;
  readonly hideNamedColumn: (name: string) => string;
  readonly showNamedColumn: (name: string) => string;
  readonly moveNamedColumnLeft: (name: string) => string;
  readonly moveNamedColumnRight: (name: string) => string;
  /** A column that cannot be hidden, in place of its toggle and when asked to hide. */
  readonly columnAlwaysShown: (name: string) => string;
  readonly resetTableSettings: string;

  // What a change to the columns announces.
  readonly columnHidden: (name: string) => string;
  /** A column shown again, with its place among however many columns show. */
  readonly columnShown: (
    name: string,
    position: number,
    total: number,
  ) => string;
  /** A column moved, with its place among however many columns show. */
  readonly columnMoved: (
    name: string,
    position: number,
    total: number,
  ) => string;
  readonly tableSettingsReset: string;

  // The sort panel.
  /** The panel's name. */
  readonly sortPanel: string;
  /** One term of the reader's ordering, by the name its field is shown by. */
  readonly sortTerm: (name: string, direction: SortDirection) => string;
  readonly moveSortTermUp: string;
  readonly moveSortTermDown: string;
  readonly removeSortTerm: string;

  // The filters.
  /** The filters' name. */
  readonly filters: string;
  /** The disclosure holding the fields not shown by default. */
  readonly moreFilters: string;
  /** The submit control of the filters' form, before scripts run. */
  readonly submitFilters: string;
  /** A number or date field's lower bound, by the field's label. */
  readonly filterFrom: (label: string) => string;
  /** A number or date field's upper bound, by the field's label. */
  readonly filterTo: (label: string) => string;
  /** The least value a matching record holds, beside the lower bound. */
  readonly filterLowest: (value: string) => string;
  /** The greatest value a matching record holds, beside the upper bound. */
  readonly filterHighest: (value: string) => string;
  /** The control clearing one restriction, by the restriction's name. */
  readonly clearFilter: (name: string) => string;
  /** A closed set's any-of group, by the field's label. */
  readonly filterIsAnyOf: (label: string) => string;
  /** A closed set's none-of group, by the field's label. */
  readonly filterIsNoneOf: (label: string) => string;
  /** The control moving a none-of set to any-of. */
  readonly matchAnyInstead: string;
  /** The control moving an any-of set to none-of. */
  readonly matchNoneInstead: string;
  /** How many matching records hold a value, beside it. */
  readonly facetCount: (count: FacetCountWords) => string;
  /** A text field's contains input, by the field's label. */
  readonly filterContains: (label: string) => string;
  /** A text field's starts-with input, by the field's label. */
  readonly filterStartsWith: (label: string) => string;
  /**
   * An emptied input, which removes nothing; `retained` is whether any
   * restriction stands on the field at all.
   */
  readonly filterIncomplete: (retained: boolean) => string;
  /**
   * An edit that did not apply, every reason it was refused for — the
   * schema's one reason, or every reason the source gave — and whether the
   * restriction this edit would have replaced is still in force.
   */
  readonly filterRefused: (
    reasons: readonly string[],
    retained: boolean,
  ) => string;

  // The search.
  /** The search input's label. */
  readonly search: string;
  /** The search form's submit control, before scripts run. */
  readonly submitSearch: string;

  // The pagination bar.
  /** The bar's name. */
  readonly pagination: string;
  /** The page size select's label. */
  readonly rowsPerPage: string;
  readonly submitPageSize: string;
  /**
   * Which rows are on screen: the place of the first, how many show, and
   * how many the window pages over, as exactly as the source counts them.
   */
  readonly rowsShown: (first: number, shown: number, total: Count) => string;
  /** The page select's name. */
  readonly page: string;
  /** How many pages there are, beside the page select. */
  readonly pageCount: (pages: number) => string;
  readonly submitPage: string;
  readonly goToFirstPage: string;
  readonly goToPreviousPage: string;
  readonly goToNextPage: string;
  readonly goToLastPage: string;

  // The saved views.
  /** The saved views' name. */
  readonly savedViews: string;
  /** What the saved views say without scripting. */
  readonly viewsUnscripted: string;
  /** The view select's label. */
  readonly view: string;
  /** The select's placeholder while no view is open. */
  readonly viewNone: string;
  /** The query has moved from the open view. */
  readonly viewModified: string;
  readonly saveView: string;
  /** Save, once a save found the view changed elsewhere. */
  readonly overwriteView: string;
  readonly revertView: string;
  /** Revert, once a save found the view changed elsewhere. */
  readonly discardViewChanges: string;
  readonly saveViewAs: string;
  readonly renameView: string;
  readonly deleteView: string;
  /** Ask the store for the views, or the arrangement, again. */
  readonly retryViews: string;
  /** The form naming a new view. */
  readonly saveAsForm: string;
  readonly submitSaveAs: string;
  /** The form renaming the open view, by its name. */
  readonly renameForm: (name: string) => string;
  readonly submitRename: string;
  /** The name input's label. */
  readonly viewName: string;
  readonly cancel: string;
  /** The question deleting a view asks first, by its name. */
  readonly deleteForm: (name: string) => string;
  readonly submitDelete: string;
  readonly viewsPending: string;
  /** The store could not list the views, and why. */
  readonly viewsUnavailable: (reason: string) => string;
  /** How many stored views cannot be read. */
  readonly viewsUnreadable: (count: number) => string;
  /** The arrangement is not being saved, and why. */
  readonly arrangementUnsaved: (reason: string) => string;
  /** A name the collection refused, and why. */
  readonly viewNameRefused: (reason: string) => string;
  /** A command in flight. */
  readonly viewPending: (command: ViewCommand) => string;
  readonly viewOpened: (name: string) => string;
  readonly viewSaved: (name: string) => string;
  readonly viewRenamed: (name: string) => string;
  readonly viewDeleted: string;
  /** A view asking for what the collection cannot show, and every reason. */
  readonly viewRefused: (name: string, reasons: readonly string[]) => string;
  /**
   * A command that met a view changed elsewhere, by the stored view's name;
   * a wording for `save-as` need not use the name, since the view under that
   * identity is not the one the reader was saving.
   */
  readonly viewConflicted: (command: ViewCommand, name: string) => string;
  readonly viewMissing: (command: ViewCommand) => string;
  readonly viewUnreadable: (command: ViewCommand, reason: string) => string;
  readonly viewFailed: (command: ViewCommand, reason: string) => string;

  // The action bar.
  /** The action bar's name. */
  readonly selectionActions: string;
  /** How many rows are selected, across pages. */
  readonly rowsSelected: (count: number) => string;
  /** The button clearing the selection, by how many rows it clears. */
  readonly deselectRows: (count: number) => string;
};
