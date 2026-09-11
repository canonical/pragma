import type {
  ColumnToSize,
  GridInteraction,
  Presentation,
  ResolvedColumn,
} from "@canonical/dataviews-core";
import { columnTemplate, resolveColumns } from "@canonical/dataviews-core";
import { useCallback, useMemo, useState } from "react";
import useDataViewsState from "../../DataViews/hooks/useDataViewsState.js";
import { sameTracks } from "../columnKeys.js";
import type { TableGeometry } from "./types.js";
import useStableValue from "./useStableValue.js";

/**
 * Give the last column whatever width the others leave, even past its own
 * maximum: its trailing edge is the table's own edge, so it is never resized
 * on its own and grows and shrinks as the columns before it are. Nothing
 * changes once the columns no longer fit, or before the container is
 * measured.
 */
const fillLast = (
  columns: readonly ResolvedColumn[],
  available: number | null,
): readonly ResolvedColumn[] => {
  const last = columns.at(-1);
  if (available === null || last === undefined) {
    return columns;
  }
  const spare =
    available - columns.reduce((total, column) => total + column.width, 0);
  return spare > 0
    ? [...columns.slice(0, -1), { id: last.id, width: last.width + spare }]
    : columns;
};

/**
 * Resolve one mounted table's geometry.
 *
 * Widths are published once, as the container's track list, rather than
 * written onto every cell. Before the container is measured the tracks are
 * declarative, so the baseline is aligned and server output deterministic;
 * afterwards the solver's pixel vector is published, which is what capping
 * and resizing need. The authoritative presentation is untouched while a
 * resize previews: the preview only replaces its own column's track.
 *
 * Two tables sharing one presentation therefore share user arrangement while
 * resolving their own widths against their own container.
 */
export default function useTableGeometry(
  presentation: Presentation,
  interaction: GridInteraction,
  columnIds: readonly string[],
): TableGeometry {
  const [width, setWidth] = useState<number | null>(null);
  // Subscribed for the re-render, not for the snapshot: the tracks below
  // are read through the record itself, so its unknown-id guard is the one
  // answer to a column the presentation never declared.
  useDataViewsState(presentation);
  const interactionState = useDataViewsState(interaction);

  const attach = useCallback(
    (node: HTMLDivElement): (() => void) | undefined => {
      setWidth(node.getBoundingClientRect().width);
      if (typeof ResizeObserver === "undefined") {
        return undefined;
      }
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
      return () => {
        observer.disconnect();
      };
    },
    [],
  );

  const tracks = useStableValue<readonly ColumnToSize[]>(
    columnIds.map((id) => ({ id, sizing: presentation.effective(id) })),
    sameTracks,
  );

  // Resolving against zero yields each column's own reservation, which is
  // exactly the width a resize should capture before the container is
  // measured — so the unmeasured case needs no separate fallback.
  const resolved = useMemo(
    () => resolveColumns(tracks, width ?? 0),
    [tracks, width],
  );
  const filled = useMemo(() => fillLast(resolved, width), [resolved, width]);
  const widths = useMemo(() => filled.map((column) => column.width), [filled]);

  const preview =
    interactionState.status === "resizing"
      ? { id: interactionState.columnId, width: interactionState.previewWidth }
      : undefined;

  // Rebuilt per render rather than memoised: the track list costs one pass
  // over the columns, and a live preview would defeat the memo anyway. The
  // solved vector is handed over rather than re-solved: before the
  // container is measured the tracks are declarative, and after it they are
  // the widths just resolved.
  // A live preview is substituted before the last column is filled, so the
  // last column follows the edge being dragged rather than waiting for the
  // commit.
  const live =
    width === null
      ? null
      : preview === undefined
        ? filled
        : fillLast(
            resolved.map((column) =>
              column.id === preview.id
                ? { id: column.id, width: preview.width }
                : column,
            ),
            width,
          );
  return {
    attach,
    template: columnTemplate(tracks, live),
    widths,
  };
}
