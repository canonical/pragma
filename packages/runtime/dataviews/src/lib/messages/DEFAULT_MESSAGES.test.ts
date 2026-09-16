import { describe, expect, it } from "vitest";
import { DEFAULT_MESSAGES as m } from "./DEFAULT_MESSAGES.js";

const exact = (value: number) => ({ kind: "exact", value }) as const;
const atLeast = (value: number) => ({ kind: "at-least", value }) as const;
const unknown = { kind: "unknown" } as const;

describe("DEFAULT_MESSAGES", () => {
  it("words the table's status row", () => {
    expect(m.statusPending).toBe("Loading…");
    expect(m.statusRegrouping).toBe("Regrouping…");
    expect(m.statusFailed("timeout")).toBe(
      "These rows could not be loaded: timeout",
    );
    expect(m.statusRefreshFailed("timeout")).toBe(
      "These rows could not be refreshed: timeout",
    );
    expect(m.statusStale("offline")).toBe(
      "These rows do not match the current query: offline",
    );
    expect(m.statusNoResults).toBe("No rows match this query.");
    expect(m.statusNoData).toBe("There is nothing here yet.");
  });

  it("words the table's selection and resize controls, with the width's plural", () => {
    expect(m.selectAllRows).toBe("Select all displayed rows");
    expect(m.selectRow("alder")).toBe("Select alder");
    expect(m.columnWidth(1)).toBe("1 pixel");
    expect(m.columnWidth(120)).toBe("120 pixels");
  });

  it("words a sort's precedence with an English ordinal once there are two terms", () => {
    expect(m.sortPrecedence("asc", 1, 1)).toBe("ascending");
    expect(m.sortPrecedence("desc", 2, 3)).toBe("descending, 2nd of 3");
    expect(m.sortPrecedence("asc", 11, 12)).toBe("ascending, 11th of 12");
  });

  it("words a refused sort with one full stop, whatever the source ended with", () => {
    expect(m.sortRefused(["this source orders by at most 1 term"])).toBe(
      "Sort unchanged: this source orders by at most 1 term.",
    );
    expect(m.sortRefused(["this source orders by at most 1 term."])).toBe(
      "Sort unchanged: this source orders by at most 1 term.",
    );
  });

  it("says a sort is unchanged where the source gave no reason worth saying", () => {
    expect(m.sortRefused([])).toBe("Sort unchanged.");
    expect(m.sortRefused(["  ", "."])).toBe("Sort unchanged.");
  });

  it("drops a blank reason rather than writing a bare stop", () => {
    expect(m.filterRefused(["", "not a number"], false)).toBe("Not a number.");
    expect(m.filterRefused([" "], false)).toBe("");
    const retained = m.filterRefused(["  "], true);
    expect(retained.startsWith(" ")).toBe(false);
    expect(retained).not.toContain("..");
  });

  it("words every reason a source refused an ordering for", () => {
    expect(m.sortRefused(["no such field", "at most 1 term"])).toBe(
      "Sort unchanged: no such field; at most 1 term.",
    );
  });

  it("runs a status on from its reason, stripped of the stop it came with", () => {
    expect(m.statusFailed("timeout.")).toBe(
      "These rows could not be loaded: timeout",
    );
    expect(m.statusRefreshFailed("timeout.")).toBe(
      "These rows could not be refreshed: timeout",
    );
    expect(m.statusStale("offline.")).toBe(
      "These rows do not match the current query: offline",
    );
  });

  it("words an ordering, the reader's and the source's", () => {
    const terms = [
      { name: "Name", direction: "asc" },
      { name: "Cores", direction: "desc" },
    ] as const;
    expect(m.sortApplied(terms)).toBe(
      "Sorted by Name, ascending; then Cores, descending.",
    );
    expect(m.sortDefaulted(terms)).toBe(
      "Sorted by the source's own order: Name, ascending; Cores, descending.",
    );
    expect(m.sortAbsent).toBe("Not sorted: the source documents no order.");
    expect(m.sortTerm("name", "desc")).toBe("name, descending");
  });

  it("words a column's header menu and the table's settings menu", () => {
    expect(m.columnOptions("Status")).toBe("Column options for Status");
    expect([
      m.sortAscending,
      m.sortDescending,
      m.removeFromSort,
      m.hideColumn,
      m.moveColumnLeft,
      m.moveColumnRight,
    ]).toEqual([
      "Sort ascending",
      "Sort descending",
      "Remove from sort",
      "Hide column",
      "Move column left",
      "Move column right",
    ]);
    expect(m.tableSettings).toBe("Table settings");
    expect(m.hideNamedColumn("Status")).toBe("Hide Status");
    expect(m.showNamedColumn("Status")).toBe("Show Status");
    expect(m.moveNamedColumnLeft("Status")).toBe("Move Status left");
    expect(m.moveNamedColumnRight("Status")).toBe("Move Status right");
    expect(m.columnAlwaysShown("Name")).toBe("Name is always shown");
    expect(m.resetTableSettings).toBe("Reset table settings");
  });

  it("words what a change to the columns announces, with its place", () => {
    expect(m.columnHidden("Status")).toBe("Status hidden");
    expect(m.columnShown("Status", 2, 3)).toBe("Status shown, position 2 of 3");
    expect(m.columnMoved("Status", 1, 3)).toBe(
      "Status moved to position 1 of 3",
    );
    expect(m.tableSettingsReset).toBe("Table settings reset");
  });

  it("words the sort panel's controls", () => {
    expect([
      m.sortPanel,
      m.moveSortTermUp,
      m.moveSortTermDown,
      m.removeSortTerm,
    ]).toEqual(["Sort", "Move up", "Move down", "Remove"]);
  });

  it("words the filters' controls and hints", () => {
    expect([m.filters, m.moreFilters, m.submitFilters]).toEqual([
      "Filters",
      "More filters",
      "Apply filters",
    ]);
    expect(m.filterFrom("Cores")).toBe("Cores from");
    expect(m.filterTo("Cores")).toBe("Cores to");
    expect(m.filterLowest("2")).toBe("Lowest: 2");
    expect(m.filterHighest("64")).toBe("Highest: 64");
    expect(m.clearFilter("Cores from")).toBe("Clear Cores from");
    expect(m.filterIsAnyOf("Status")).toBe("Status is any of");
    expect(m.filterIsNoneOf("Status")).toBe("Status is none of");
    expect(m.matchAnyInstead).toBe("Match any of these instead");
    expect(m.matchNoneInstead).toBe("Match none of these instead");
    expect(m.facetCount(exact(12))).toBe("12");
    expect(m.facetCount(atLeast(1000))).toBe("at least 1,000");
    expect(m.filterContains("Name")).toBe("Name contains");
    expect(m.filterStartsWith("Name")).toBe("Name starts with");
  });

  it("words why a filter edit did not apply, and whether the earlier restriction stands", () => {
    expect(m.filterIncomplete(false)).toBe(
      "Enter a value to apply this restriction.",
    );
    expect(m.filterIncomplete(true)).toBe(
      "Enter a value to change this restriction. The previous restriction still applies.",
    );
    // One message for every refusal, whether the schema gave one reason or
    // the source gave several.
    expect(m.filterRefused(["not a number"], false)).toBe("Not a number.");
    expect(m.filterRefused(["not a number"], true)).toBe(
      "Not a number. The previous restriction still applies.",
    );
    expect(m.filterRefused(["no bounds here", "no ranges"], false)).toBe(
      "No bounds here. No ranges.",
    );
  });

  it("words the search", () => {
    expect([m.search, m.submitSearch]).toEqual(["Search", "Search"]);
  });

  it("words the pagination bar, counting rows rather than items, with no colon in a name", () => {
    expect([
      m.pagination,
      m.rowsPerPage,
      m.submitPageSize,
      m.page,
      m.submitPage,
      m.goToFirstPage,
      m.goToPreviousPage,
      m.goToNextPage,
      m.goToLastPage,
    ]).toEqual([
      "Pagination",
      "Rows per page",
      "Apply page size",
      "Page",
      "Go to page",
      "First page",
      "Previous page",
      "Next page",
      "Last page",
    ]);
    expect(m.pageCount(1)).toBe("of 1 page");
    expect(m.pageCount(4)).toBe("of 4 pages");
  });

  it("words which rows are on screen, as exactly as the source counts them", () => {
    expect(m.rowsShown(6, 5, exact(12))).toBe("Showing 6–10 out of 12 rows");
    expect(m.rowsShown(1, 0, exact(0))).toBe("Showing 0 out of 0 rows");
    expect(m.rowsShown(6, 1, exact(6))).toBe("Showing row 6 out of 6");
    expect(m.rowsShown(1, 5, atLeast(100))).toBe(
      "Showing 1–5 out of at least 100 rows",
    );
    expect(m.rowsShown(3, 1, atLeast(3))).toBe(
      "Showing row 3 out of at least 3",
    );
    expect(m.rowsShown(1, 5, unknown)).toBe("Showing 1–5 rows");
    expect(m.rowsShown(2, 1, unknown)).toBe("Showing row 2");
    expect(m.rowsShown(1, 1, exact(1))).toBe("Showing row 1 out of 1");
  });

  it("groups a large count as English writes it", () => {
    expect(m.rowsShown(1, 50, exact(12345))).toBe(
      "Showing 1–50 out of 12,345 rows",
    );
    expect(m.pageCount(1200)).toBe("of 1,200 pages");
    expect(m.rowsSelected(2500)).toBe("2,500 selected");
    expect(m.columnWidth(1024)).toBe("1,024 pixels");
  });

  it("words the saved views' controls and notices", () => {
    expect([
      m.savedViews,
      m.viewsUnscripted,
      m.view,
      m.viewNone,
      m.viewModified,
      m.saveView,
      m.overwriteView,
      m.revertView,
      m.discardViewChanges,
      m.saveViewAs,
      m.renameView,
      m.deleteView,
      m.retryViews,
      m.saveAsForm,
      m.submitSaveAs,
      m.submitRename,
      m.viewName,
      m.cancel,
      m.submitDelete,
      m.viewsPending,
    ]).toEqual([
      "Saved views",
      "Saved views need JavaScript. A link to a query still works.",
      "View",
      "No saved view",
      "Modified",
      "Save",
      "Overwrite",
      "Revert",
      "Discard changes",
      "Save as…",
      "Rename…",
      "Delete…",
      "Try again",
      "Save as a new view",
      "Save view",
      "Rename",
      "Name",
      "Cancel",
      "Delete view",
      "Loading saved views…",
    ]);
    expect(m.renameForm("Busy")).toBe('Rename "Busy"');
    expect(m.deleteForm("Busy")).toBe('Delete "Busy"? This cannot be undone.');
    expect(m.viewsUnavailable("blocked")).toBe(
      "Saved views are unavailable: blocked.",
    );
    expect(m.viewsUnreadable(1)).toBe("1 saved view cannot be read.");
    expect(m.viewsUnreadable(2)).toBe("2 saved views cannot be read.");
    expect(m.arrangementUnsaved("quota")).toBe(
      "The arrangement is not being saved: quota.",
    );
    expect(m.viewNameRefused("name is taken")).toBe("Name is taken.");
  });

  it("ends a reason with one full stop, whatever the store ended it with", () => {
    expect(m.viewsUnavailable("blocked.")).toBe(
      "Saved views are unavailable: blocked.",
    );
    expect(m.arrangementUnsaved("quota.")).toBe(
      "The arrangement is not being saved: quota.",
    );
    expect(m.viewFailed("save", "quota exceeded.")).toBe(
      "Not saved: quota exceeded.",
    );
    expect(m.viewUnreadable("open", "bad json.")).toBe(
      "Not opened: the stored view cannot be read (bad json).",
    );
    expect(m.viewNameRefused("name is taken.")).toBe("Name is taken.");
    expect(m.viewRefused("Busy", ["no field."])).toBe(
      'Not opened: "Busy" asks for what this collection cannot show — no field. The query is unchanged.',
    );
  });

  it("words every saved-view command's progress and outcome", () => {
    expect(
      (["open", "save", "save-as", "rename", "remove"] as const).map(
        m.viewPending,
      ),
    ).toEqual([
      "Opening the view…",
      "Saving…",
      "Saving…",
      "Renaming…",
      "Deleting…",
    ]);
    expect(m.viewOpened("Busy")).toBe('Opened "Busy".');
    expect(m.viewSaved("Busy")).toBe('Saved "Busy".');
    expect(m.viewRenamed("Idle")).toBe('Renamed to "Idle".');
    expect(m.viewDeleted).toBe("View deleted.");
    expect(m.viewRefused("Busy", ["no field", "no operator"])).toBe(
      'Not opened: "Busy" asks for what this collection cannot show — no field; no operator. The query is unchanged.',
    );
    expect(m.viewConflicted("save", "Busy")).toBe(
      'Not saved: "Busy" was changed elsewhere. Overwrite it, save your changes as a new view, or discard them.',
    );
    expect(m.viewConflicted("save-as", "")).toBe(
      "Not saved: a different view is stored under the same identity. Try again.",
    );
    expect(m.viewConflicted("rename", "Busy")).toBe(
      'Not renamed: "Busy" was changed elsewhere. Its latest version is open; try again.',
    );
    expect(m.viewMissing("remove")).toBe(
      "Not deleted: the view no longer exists.",
    );
    expect(m.viewUnreadable("open", "bad json")).toBe(
      "Not opened: the stored view cannot be read (bad json).",
    );
    expect(m.viewFailed("save", "quota")).toBe("Not saved: quota.");
  });

  it("words the action bar, counting rows", () => {
    expect(m.selectionActions).toBe("Selection actions");
    expect(m.rowsSelected(3)).toBe("3 selected");
    expect(m.deselectRows(1)).toBe("Deselect 1 row");
    expect(m.deselectRows(3)).toBe("Deselect 3 rows");
  });
});
