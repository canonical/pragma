import type {
  JsonValue,
  PresentationPatch,
  RowRecord,
  SchemaFieldDefinition,
  ViewPresentation,
} from "@canonical/dataviews-core";
import {
  type ColumnCommandConfig,
  hideColumn,
  moveColumn,
  readProviderHost,
  resetColumnArrangement,
  resolveColumnArrangement,
  showColumn,
  spellColumnArrangement,
} from "@canonical/dataviews-core/bindings";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useDataViewsValue } from "../../../hooks/index.js";
import type {
  AnnouncementHandle,
  ColumnAnnouncement,
  ColumnChange,
  ColumnSetting,
  SettingsDestinations,
} from "../common/index.js";
import {
  areColumnSettingsEqual,
  areColumnsEqual,
  listColumnSettings,
  spellDestinationKey,
} from "../common/utils/index.js";
import type { DataTableColumn } from "../types.js";
import type {
  UseColumnManagementProps,
  UseColumnManagementResult,
} from "./types.js";
import useStableCallback from "./useStableCallback.js";
import useStableValue from "./useStableValue.js";

/** What each change writes to an arrangement, or null where it changes nothing. */
const CHANGES = {
  hide: hideColumn,
  show: showColumn,
  "move-left": (config) => moveColumn({ ...config, offset: -1 }),
  "move-right": (config) => moveColumn({ ...config, offset: 1 }),
} satisfies Readonly<
  Record<
    ColumnChange,
    (config: ColumnCommandConfig<DataTableColumn>) => PresentationPatch | null
  >
>;

/** Every change, in the order a column lists them. */
const COLUMN_CHANGES = [
  "hide",
  "show",
  "move-left",
  "move-right",
] as const satisfies readonly ColumnChange[];

/** The arrangement a change leaves: its keys over the arrangement's. */
const applyPatch = (
  presentation: ViewPresentation,
  patch: PresentationPatch,
): ViewPresentation =>
  Object.fromEntries(
    Object.entries({ ...presentation, ...patch }).filter(
      (entry): entry is [string, JsonValue] => entry[1] !== undefined,
    ),
  );

/** The ids an arrangement shows, in its order. */
const listShownIds = (
  columns: readonly DataTableColumn[],
  presentation: ViewPresentation,
): readonly string[] =>
  resolveColumnArrangement(columns, presentation)
    .filter(({ hidden }) => !hidden)
    .map(({ column }) => column.id);

/**
 * The table's column management: each declared column with the changes it
 * takes now, whether a reset would change anything, the commands that hide,
 * show, move and reset columns, the announcement they speak through, and
 * where each change leads without scripting.
 *
 * Every change is presentation: it is written to the provider's
 * presentation and asks the source for nothing, so it moves no query, no
 * request and no location. A change that would leave the arrangement as it
 * is changes nothing, except that asking to hide a column declared
 * `hideable: false` announces that it is always shown. The commands read
 * the latest arrangement and columns, not this render's, and hold one
 * identity each. When hiding a column takes the focus with it — its own
 * header's menu is gone — focus moves to the nearest heading holding a
 * control: the one now standing where it stood, then those after it, then
 * those before it, and the table's settings last. A reset clears the
 * viewer's own layer alone, so it is offered only while that layer holds
 * something to clear.
 *
 * Each column's offers are read from one resolution of the arrangement, and
 * a column keeps its offers object while its changes hold, so a width
 * committed renders no header's menu again.
 */
export default function useColumnManagement<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
  columns,
  headerRow,
}: UseColumnManagementProps<TFields, TRow>): UseColumnManagementResult {
  const { presentation } = provider;
  const declared = useStableValue(columns, areColumnsEqual);
  // The arrangement alone: a change to the reason re-renders no table.
  const arrangement = useDataViewsValue(
    presentation.state,
    (shown) => shown.presentation,
  );
  // The list last handed out, whose offers objects a new list keeps where a
  // column's changes hold. Written during render: the latest list is what
  // every later render compares with, so a discarded render writing it
  // first is harmless.
  const previous = useRef<readonly ColumnSetting[]>([]);
  const derived = useMemo(
    () => listColumnSettings(declared, arrangement, previous.current),
    [declared, arrangement],
  );
  // Held at one reference while they say the same: a resize writes a width,
  // which changes no column's visibility or place.
  const settings = useStableValue(derived, areColumnSettingsEqual);
  previous.current = settings;
  // Each column's offers by its id, so a header reads its own at once on
  // every render of the header row.
  const offersById = useMemo(
    () => new Map(settings.map(({ column, offers }) => [column.id, offers])),
    [settings],
  );
  const readOffers = useCallback(
    (columnId: string): ColumnSetting["offers"] => {
      const offers = offersById.get(columnId);
      if (offers === undefined) {
        throw new Error(`no column "${columnId}" is declared`);
      }
      return offers;
    },
    [offersById],
  );
  // The viewer's own changes where a change is written now: what a reset can
  // clear, so an open view's saved arrangement beneath never keeps it on.
  const own = useDataViewsValue(presentation.state, (shown) => shown.own);
  const resettable = useMemo(
    () => Object.keys(resetColumnArrangement({ presentation: own })).length > 0,
    [own],
  );

  // The table's announcement, which holds what it says itself: saying
  // something renders the region and nothing of the table.
  const announcer = useRef<AnnouncementHandle>(null);
  const announce = (subject: ColumnAnnouncement): void => {
    announcer.current?.announce(subject);
  };

  // Where a hidden column stood among the shown ones, until the render that
  // removed it has recovered the focus it may have taken. Run after every
  // render, reading a ref: the render that removed a column is not one the
  // effect could name by what it reads.
  const recoverAt = useRef<number | null>(null);
  useLayoutEffect(() => {
    const at = recoverAt.current;
    const row = headerRow.current;
    if (at === null || row === null) {
      return;
    }
    recoverAt.current = null;
    const active = row.ownerDocument.activeElement;
    // Focus kept somewhere — a menu's button took it back — is left there.
    if (active !== null && active !== row.ownerDocument.body) {
      return;
    }
    // Arrays from the lists, not spreads: a node list is iterable only where
    // the DOM's iterable typings are loaded.
    const cells = Array.from(
      row.querySelectorAll<HTMLElement>(
        ":scope > [role='columnheader']:not(.selection):not(.settings)",
      ),
    );
    const nearest = Math.max(0, Math.min(at, cells.length - 1));
    // The heading now standing where the hidden column stood, then those
    // after it, then those before it, nearest first, then the settings: the
    // first holding a control takes the focus.
    const candidates = [
      ...cells.slice(nearest),
      ...cells.slice(0, nearest).reverse(),
      ...Array.from(row.querySelectorAll<HTMLElement>(":scope > .settings")),
    ];
    for (const cell of candidates) {
      const control = cell.querySelector<HTMLElement>("button, a[href]");
      if (control !== null) {
        control.focus();
        return;
      }
    }
  });

  const changeColumn = useStableCallback(
    (columnId: string, change: ColumnChange) => {
      const column = columns.find((candidate) => candidate.id === columnId);
      if (column === undefined) {
        return;
      }
      const current = presentation.state.get().presentation;
      const patch = CHANGES[change]({
        columns,
        presentation: current,
        id: columnId,
      });
      if (patch === null) {
        if (change === "hide" && column.hideable === false) {
          announce({ kind: "always-shown", column });
        }
        return;
      }
      const before = listShownIds(columns, current).indexOf(columnId);
      presentation.arrange(patch);
      if (change === "hide") {
        recoverAt.current = before;
        announce({ kind: "hidden", column });
        return;
      }
      const shown = listShownIds(
        columns,
        presentation.state.get().presentation,
      );
      announce({
        kind: change === "show" ? "shown" : "moved",
        column,
        position: shown.indexOf(columnId) + 1,
        count: shown.length,
      });
    },
  );

  const resetColumns = useStableCallback(() => {
    const patch = resetColumnArrangement({
      presentation: presentation.state.get().own,
    });
    if (Object.keys(patch).length === 0) {
      return;
    }
    presentation.arrange(patch);
    announce({ kind: "reset" });
  });

  const { spellQuery } = readProviderHost(provider);
  const listDestinations = useStableCallback(
    (): SettingsDestinations | null => {
      // The same query from the page it stands on, read once for every
      // link: a change to the columns asks the source for nothing, so the
      // window stays where it is.
      const { slice, window: queryWindow } = provider.state.get();
      const params = spellQuery({ slice, window: queryWindow });
      if (params === null) {
        return null;
      }
      // Spelled from the stored lists, so a link keeps what another table
      // over the same presentation holds.
      const spell = (next: ViewPresentation | null): string =>
        `?${spellColumnArrangement({ params, columns, presentation: next })}`;
      const current = presentation.state.get().presentation;
      const changes = new Map<string, string>();
      for (const column of columns) {
        for (const change of COLUMN_CHANGES) {
          const patch = CHANGES[change]({
            columns,
            presentation: current,
            id: column.id,
          });
          if (patch !== null) {
            changes.set(
              spellDestinationKey(column.id, change),
              spell(applyPatch(current, patch)),
            );
          }
        }
      }
      return { changes, reset: spell(null) };
    },
  );

  return {
    settings,
    readOffers,
    resettable,
    announcer,
    changeColumn,
    resetColumns,
    listDestinations,
  };
}
