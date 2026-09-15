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
import { useMemo, useRef } from "react";
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
 * identity each. A reset clears the viewer's own layer alone, so it is
 * offered only while that layer holds something to clear.
 *
 * Each column's offers are read from one resolution of the arrangement, and
 * a column keeps its offers object while its changes hold.
 */
export default function useColumnManagement<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
  columns,
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
      presentation.arrange(patch);
      if (change === "hide") {
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
    resettable,
    announcer,
    changeColumn,
    resetColumns,
    listDestinations,
  };
}
