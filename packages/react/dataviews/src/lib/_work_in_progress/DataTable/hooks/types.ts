/**
 * Hook domain types for the DataTable domain. Each hook declares its props
 * and result types here.
 */

import type {
  DataViewsProvider,
  Presentation,
  ResultWindow,
  RowRecord,
  SchemaFieldDefinition,
  Slice,
  SortDirection,
} from "@canonical/dataviews-core";
import type { RefObject } from "react";
import type {
  AnnouncementHandle,
  ColumnChange,
  ColumnSetting,
  SettingsDestinations,
  SortPrecedence,
} from "../common/index.js";
import type { DataTableColumn } from "../types.js";

/** What the column management hook reads: the provider, the declared columns and the header row. */
export type UseColumnManagementProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly provider: DataViewsProvider<TFields, TRow>;
  /** The columns as declared, in their declared order. */
  readonly columns: readonly DataTableColumn[];
  /** The header row, whose controls take the focus a hidden column leaves. */
  readonly headerRow: RefObject<HTMLDivElement | null>;
};

/** The table's column management, as its menus and its announcement read it. */
export type UseColumnManagementResult = {
  /** Every declared column in the arrangement's order, with the changes it takes. */
  readonly settings: readonly ColumnSetting[];
  /** Whether a reset would change the viewer's own layer. */
  readonly resettable: boolean;
  /**
   * The changes one declared column takes now, one object per column while
   * those changes hold; throws for a column the table does not declare.
   */
  readonly readOffers: (columnId: string) => ColumnSetting["offers"];
  /** The announcement the table renders, which says what each change did. */
  readonly announcer: RefObject<AnnouncementHandle | null>;
  /** Apply one change to one column; one identity for every column. */
  readonly changeColumn: (columnId: string, change: ColumnChange) => void;
  /** Return to the arrangement beneath the viewer's own changes. */
  readonly resetColumns: () => void;
  /**
   * Where every change and the reset lead without scripting, spelled over
   * one reading of the query, or null without a location.
   */
  readonly listDestinations: () => SettingsDestinations | null;
};

/** One table's resolved geometry. */
export type UseTableGeometryResult = {
  /**
   * Attaches the container whose inline size the solver resolves against,
   * returning the detach when there is an observer to disconnect. A React 19
   * ref callback that returns a cleanup is never called with `null`, so the
   * node is always a real one.
   */
  readonly attach: (node: HTMLDivElement) => (() => void) | undefined;
  /**
   * Attaches a cell one of the stylesheet's own tracks sizes — the
   * selection column's, the settings cell's — whose width the columns
   * leave; the cleanup gives it back.
   */
  readonly reserve: (cell: HTMLDivElement) => () => void;
  /**
   * The shared track list every row of this table consumes; undefined with
   * no columns, where there is no track to publish.
   */
  readonly template: string | undefined;
  /** The resolved widths, positionally aligned with the column ids. */
  readonly widths: readonly number[];
};

/** What the arrangement hook takes: the presentation that arranges the declared columns. */
export type UseColumnArrangementProps = {
  readonly presentation: Presentation;
  /** The columns as declared, in their declared order. */
  readonly columns: readonly DataTableColumn[];
};

/** The columns a table renders, in the arrangement's order, the hidden ones left out. */
export type UseColumnArrangementResult = readonly DataTableColumn[];

/** What the header row's sort hook reads: the provider, the columns shown and the query in force. */
export type UseHeaderSortProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly provider: DataViewsProvider<TFields, TRow>;
  /** The columns the presentation shows, in its order. */
  readonly columns: readonly DataTableColumn[];
  /** The applied query's slice. */
  readonly slice: Slice;
  /** The applied query's window. */
  readonly window: ResultWindow;
};

/** What the header row's sort hook gives each header. */
export type UseHeaderSortResult = {
  /** Where each field stands in the ordering in force, by field. */
  readonly precedences: ReadonlyMap<string, SortPrecedence>;
  /** The one column that carries `aria-sort`, or null when none shows the first term. */
  readonly primaryColumnId: string | null;
  /** The fields the reader's own ordering names, which a column's menu can remove. */
  readonly stated: ReadonlySet<string>;
  /** Why the last activation of a column changed nothing, or null. */
  readonly readReason: (columnId: string) => string | null;
  /**
   * Where a plain activation of a column leads without scripting, as
   * `?query`, or null for a column not shown.
   */
  readonly spellDestination: (columnId: string) => string | null;
  /**
   * Activate a column's sort, as a further term when `additive`. Each action
   * takes the column's id alone and reads its field from the columns shown.
   */
  readonly sortColumn: (columnId: string, additive: boolean) => void;
  /** Sort by a column in a direction, from its menu. */
  readonly placeColumn: (columnId: string, direction: SortDirection) => void;
  /** Take a column out of the reader's ordering, from its menu. */
  readonly removeFromSort: (columnId: string) => void;
  /** Let a refusal's reason go. */
  readonly clearRefusal: () => void;
};
