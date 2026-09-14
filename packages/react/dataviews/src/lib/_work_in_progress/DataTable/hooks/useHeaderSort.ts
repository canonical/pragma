import type {
  RowRecord,
  SchemaFieldDefinition,
  SortDirection,
  SortTerm,
} from "@canonical/dataviews-core";
import {
  areListsEqual,
  cycleSortTerm,
  placeSortTerm,
  readProviderHost,
  resolveEffectiveOrdering,
} from "@canonical/dataviews-core/bindings";
import { useMemo, useState } from "react";
import { areSortTermsEqual } from "../../../utils/index.js";
import type { SortPrecedence } from "../common/index.js";
import { readFieldName } from "../common/utils/index.js";
import type { UseHeaderSortProps, UseHeaderSortResult } from "./types.js";
import useStableCallback from "./useStableCallback.js";

/**
 * What a header says before the source's reason when a sort changed nothing,
 * collected so it can be localised in one place.
 */
const SORT_UNCHANGED = "Sort unchanged";

/** The last activation a source refused, and the header it came from. */
type SortRefusal = {
  readonly columnId: string;
  readonly reason: string;
  /** The ordering it was refused over. */
  readonly sort: readonly SortTerm[];
  /** How many refusals in a row, so a repeat reads as new. */
  readonly repeats: number;
};

/**
 * The table header row's sort: the ordering in force and what each column
 * shows of it, the one column that claims it, the reason a refused
 * activation gives, where a column's link leads without scripting, and the
 * actions every header shares.
 *
 * The ordering, the precedences, the claimed column and the stated fields
 * are derived again only when the ordering or the columns change — not on
 * every frame of a resize. The actions read the latest ordering, not this
 * render's, so two activations in one frame each build on the one before,
 * and each is held behind one identity, shared by every column, so the
 * header row's re-renders reach no column's menu.
 */
export default function useHeaderSort<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
  columns,
  slice,
  window: queryWindow,
}: UseHeaderSortProps<TFields, TRow>): UseHeaderSortResult {
  const declared = provider.capabilities.sort;
  // The last activation the source refused, until the next one is accepted.
  const [refusal, setRefusal] = useState<SortRefusal | null>(null);

  // The query's own terms, or the source's default when it states none.
  // Group levels lead these terms once a source can group; whether a header
  // claims or counts a group level is the grouping rung's to decide.
  // Keyed on the two parts of the slice that order rows, so a filter, a
  // search or a page turn derives nothing again.
  const { sort, group } = slice;
  const ordering = useMemo(
    () => resolveEffectiveOrdering({ sort, group }, declared).terms,
    [sort, group, declared],
  );
  const precedences = useMemo(
    () =>
      new Map(
        ordering.map((term, at): [string, SortPrecedence] => [
          term.field,
          {
            direction: term.direction,
            position: at + 1,
            count: ordering.length,
          },
        ]),
      ),
    [ordering],
  );
  // One header claims the sort: the first column showing the first term's
  // field, and none when no column shows it.
  const primaryColumnId = useMemo(() => {
    const primaryField = ordering.at(0)?.field;
    return (
      columns.find((column) => readFieldName(column) === primaryField)?.id ??
      null
    );
  }, [ordering, columns]);
  // The fields the reader's own ordering names, which a menu can remove.
  const stated = useMemo(() => new Set(sort.map((term) => term.field)), [sort]);

  // Apply one header's change to the ordering, saying why when the source
  // refuses it. A header hands back only its column's id, and the field is
  // read from the columns shown now, so the two can never disagree. The
  // reason is kept with the ordering it was refused over, and counted, so a
  // second identical refusal is announced again.
  const applyToColumn = (
    columnId: string,
    build: (field: string, sort: readonly SortTerm[]) => readonly SortTerm[],
  ) => {
    const column = columns.find((candidate) => candidate.id === columnId);
    // A header acting after its column left the arrangement changes nothing.
    if (column === undefined) {
      return;
    }
    const refused = provider
      .setSort(build(readFieldName(column), provider.state.get().slice.sort))
      .at(0);
    // Read now, not in the updater: React may run the updater after a later
    // change in the same event, and the reason belongs to this ordering.
    const refusedOver = provider.state.get().slice.sort;
    setRefusal((previous) =>
      refused === undefined
        ? null
        : {
            columnId,
            // One full stop, whether or not the source ended its reason.
            reason: `${SORT_UNCHANGED}: ${refused.reason.replace(/\.$/, "")}.`,
            sort: refusedOver,
            repeats: (previous?.repeats ?? 0) + 1,
          },
    );
  };
  const sortColumn = useStableCallback(
    (columnId: string, additive: boolean) => {
      applyToColumn(columnId, (field, current) =>
        cycleSortTerm(current, field, additive),
      );
    },
  );
  const placeColumn = useStableCallback(
    (columnId: string, direction: SortDirection) => {
      applyToColumn(columnId, (field, current) =>
        placeSortTerm(current, field, direction, declared.terms),
      );
    },
  );
  const removeFromSort = useStableCallback((columnId: string) => {
    applyToColumn(columnId, (field, current) =>
      current.filter((term) => term.field !== field),
    );
  });
  // Asked on every focus move out of a column, and nearly always with nothing
  // refused: an update nothing needs can still run the table once.
  const clearRefusal = useStableCallback(() => {
    setRefusal((previous) => (previous === null ? previous : null));
  });

  // A reason stands only over the ordering it was refused for, and only
  // while its column is shown: a change from anywhere else — a panel, the
  // URL, Back, another table — or the column leaving the arrangement ends
  // it, for good, so going Forward again or showing the column again does
  // not bring back a reason nobody asked for.
  const standing =
    refusal !== null &&
    areListsEqual(refusal.sort, slice.sort, areSortTermsEqual) &&
    columns.some((column) => column.id === refusal.columnId)
      ? refusal
      : null;
  if (refusal !== null && standing === null) {
    setRefusal(null);
  }
  const readReason = (columnId: string): string | null =>
    standing?.columnId === columnId
      ? // A trailing no-break space on every other refusal: the text a live
        // region holds must change to be read again.
        `${standing.reason}${standing.repeats % 2 === 0 ? "\u00a0" : ""}`
      : null;

  const { spellQuery } = readProviderHost(provider);
  const spellDestination = (columnId: string): string | null => {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (column === undefined) {
      return null;
    }
    const field = readFieldName(column);
    const params = spellQuery({
      slice: { ...slice, sort: cycleSortTerm(slice.sort, field, false) },
      // A new ordering is a new window: the page counted rows in the old one,
      // and a cursor pointed into it. The spelled query writes no cursor
      // today; the window handed on keeps none in case it ever does.
      window: { ...queryWindow, page: 1, cursor: null },
    });
    return params === null ? null : `?${params}`;
  };

  return {
    precedences,
    primaryColumnId,
    stated,
    readReason,
    spellDestination,
    sortColumn,
    placeColumn,
    removeFromSort,
    clearRefusal,
  };
}
