import {
  buildColumnTemplate,
  type ColumnLayout,
  type ColumnToSize,
  type GridInteraction,
  type ResolvedColumn,
  resolveColumns,
} from "@canonical/dataviews-core/bindings";
import { useCallback, useMemo, useState } from "react";
import { useDataViewsValue } from "../../DataViews/hooks/index.js";
import areTracksEqual from "../areTracksEqual.js";
import type { UseTableGeometryResult } from "./types.js";
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
 * Call `onResize` with each resize of one element. Returns the disconnect,
 * or nothing where there is no observer.
 */
const observeResize = (
  element: HTMLElement,
  onResize: (entry: ResizeObserverEntry) => void,
): (() => void) | undefined => {
  if (typeof ResizeObserver === "undefined") {
    return undefined;
  }
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      onResize(entry);
    }
  });
  observer.observe(element);
  return () => {
    observer.disconnect();
  };
};

/**
 * Resolve one mounted table's geometry.
 *
 * Widths are published once, as the container's track list, rather than
 * written onto every cell. Before the container is measured the tracks are
 * declarative, so the baseline is aligned and server output deterministic;
 * afterwards the solver's pixel vector is published, which is what capping
 * and resizing need. The authoritative layout is untouched while a
 * resize previews: the preview only replaces its own column's track.
 *
 * The columns are resolved against the container's content width less the
 * selection track, whose width is the stylesheet's: it is read back from the
 * cell that track sizes, observed for as long as that cell is there.
 *
 * Two tables sharing one layout therefore share user arrangement while
 * resolving their own widths against their own container.
 */
export default function useTableGeometry(
  layout: ColumnLayout,
  interaction: GridInteraction,
  columnIds: readonly string[],
): UseTableGeometryResult {
  const [container, setContainer] = useState<number | null>(null);
  const [reserved, setReserved] = useState(0);
  // Subscribed for the re-render, not for the snapshot: the tracks below
  // are read through the record itself, so its unknown-id guard is the one
  // answer to a column the layout never declared.
  useDataViewsValue(layout.state);
  const interactionState = useDataViewsValue(interaction.state);

  const attach = useCallback(
    (node: HTMLDivElement): (() => void) | undefined => {
      // Inside the border, which is no room for a column. The observer's
      // first report, which follows at once, is the exact content width.
      setContainer(node.clientWidth);
      return observeResize(node, (entry) => {
        setContainer(entry.contentRect.width);
      });
    },
    [],
  );

  // Observed on its own: the track is sized in rem, so a root font-size
  // change moves it with no change to the container. Read as its layout
  // width every time — never its bounding box, which an ancestor's
  // transform would scale.
  const reserve = useCallback((cell: HTMLDivElement): (() => void) => {
    const measure = (): void => {
      setReserved(cell.offsetWidth);
    };
    measure();
    const disconnect = observeResize(cell, measure);
    return () => {
      disconnect?.();
      setReserved(0);
    };
  }, []);

  const width = container === null ? null : Math.max(0, container - reserved);

  const tracks = useStableValue<readonly ColumnToSize[]>(
    columnIds.map((id) => ({ id, sizing: layout.effective(id) })),
    areTracksEqual,
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
    reserve,
    // No columns, no tracks: nothing is published, and a selectable table's
    // template keeps its selection track alone rather than turning invalid.
    template:
      tracks.length === 0 ? undefined : buildColumnTemplate(tracks, live),
    widths,
  };
}
