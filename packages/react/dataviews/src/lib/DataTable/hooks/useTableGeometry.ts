import type {
  ColumnToSize,
  GridInteraction,
  Presentation,
} from "@canonical/dataviews-core";
import { columnTemplate, resolveColumns } from "@canonical/dataviews-core";
import { useCallback, useMemo, useState } from "react";
import useDataViewsState from "../../DataViews/hooks/useDataViewsState.js";
import { sameTracks } from "../columnKeys.js";
import type { TableGeometry } from "./types.js";
import useStableValue from "./useStableValue.js";

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
  const widths = useMemo(
    () => resolved.map((column) => column.width),
    [resolved],
  );

  const preview =
    interactionState.status === "resizing"
      ? { id: interactionState.columnId, width: interactionState.previewWidth }
      : undefined;

  // Rebuilt per render rather than memoised: the track list costs one pass
  // over the columns, and a live preview would defeat the memo anyway. The
  // solved vector is handed over rather than re-solved: before the
  // container is measured the tracks are declarative, and after it they are
  // the widths just resolved.
  return {
    attach,
    template: columnTemplate(tracks, width === null ? null : resolved, preview),
    widths,
  };
}
