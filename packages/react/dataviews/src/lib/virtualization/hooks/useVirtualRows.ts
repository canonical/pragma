import type { RowModel } from "@canonical/dataviews-core";
import type { MountedRange } from "@canonical/dataviews-core/virtualization";
import { createVirtualRange } from "@canonical/dataviews-core/virtualization";
import type { FocusEvent } from "react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { UseVirtualRowsProps, UseVirtualRowsResult } from "./types.js";

/** What the rows' heights were last measured against. */
type Snapshot = Pick<UseVirtualRowsProps, "entries" | "model" | "tracks">;

/** A row both models hold, as different records: its height may differ. */
const wasReplaced = (
  before: RowModel<object>,
  after: RowModel<object>,
  rowId: string,
): boolean => {
  const record = before.byId(rowId);
  return record !== undefined && record !== after.byId(rowId);
};

/**
 * The rows showing a replaced record under the id they kept, whose height
 * may have changed with it. A changed status needs no such check: the
 * table's status row leaves while the next request is pending, and its
 * measurement leaves with it.
 */
const replaced = (before: Snapshot, after: Snapshot): string[] => {
  const ids: string[] = [];
  for (const entry of after.entries) {
    if (
      entry.kind === "record" &&
      wasReplaced(before.model, after.model, entry.rowId)
    ) {
      ids.push(entry.id);
    }
  }
  return ids;
};

/** The viewport a body measures against: the table root, its parent. */
const viewportOf = (body: HTMLDivElement | null): HTMLElement =>
  // A layout effect runs with the body mounted, and the body is always
  // rendered inside the table's root.
  (body as HTMLDivElement).parentElement as HTMLElement;

/**
 * Mount one table's entries near its viewport: the range deciding which,
 * and the browser work feeding it.
 *
 * The table's root is the viewport. A scroll places the viewport among the
 * entries; one resize observer reports the viewport's size and every
 * mounted row's. New tracks, or a new row width, outdate every measurement
 * of a row not mounted; a replaced record outdates its own. The row holding
 * focus stays mounted wherever the viewport goes, and the scroll corrects
 * itself when rows above the viewport are measured, replaced or added.
 *
 * On the server, and while hydrating, every entry is mounted: the full
 * current window is the markup a reader without JavaScript gets, and the
 * range narrows it once the viewport is measured.
 */
export default function useVirtualRows({
  entries,
  estimatedRowHeight,
  model,
  tracks,
}: UseVirtualRowsProps): UseVirtualRowsResult {
  const range = useMemo(
    () =>
      createVirtualRange({
        estimates: { record: estimatedRowHeight, status: estimatedRowHeight },
      }),
    [estimatedRowHeight],
  );
  const body = useRef<HTMLDivElement>(null);
  // The entry id of every mounted row element.
  const [measured] = useState(() => new Map<Element, string>());
  const observer = useRef<ResizeObserver | null>(null);
  const shift = useRef(0);
  const previous = useRef<Snapshot>({ entries, model, tracks });
  // Where the viewport starts as far as the range knows: set by every
  // placement and moved by every correction. A correction is made from
  // here, never from the viewport's scroll, which the browser may already
  // have held to the end of a page that shrank.
  const expected = useRef(0);
  // A correction for forgotten heights, made again once their gaps are
  // rendered: until then a page that grows may be too short to hold it.
  const reassert = useRef(false);
  const [, refresh] = useReducer((count: number) => count + 1, 0);

  // Set while rendering, so the runs always index the entries rendered;
  // the range notifies nobody for it, and the scroll it asks for is made
  // once the rows are committed.
  shift.current += range.setEntries(entries);

  const complete = useMemo<MountedRange>(
    () => ({ runs: [{ start: 0, end: entries.length, before: 0 }], after: 0 }),
    [entries.length],
  );
  const mounted = useSyncExternalStore(
    range.subscribe,
    range.get,
    () => complete,
  );

  // The header sticks to the viewport's top and the rows show beneath it:
  // the entries in view start where the scroll does, in a viewport one
  // header shorter.
  const place = useCallback((): void => {
    const group = body.current as HTMLDivElement;
    const viewport = viewportOf(group);
    expected.current = viewport.scrollTop;
    range.setViewport(
      expected.current,
      viewport.clientHeight - group.offsetTop,
    );
  }, [range]);

  const correct = useCallback((moved: number): void => {
    if (moved !== 0) {
      expected.current += moved;
      viewportOf(body.current).scrollTop = expected.current;
    }
  }, []);

  // One ref per mounted entry, held for as long as its row is mounted so a
  // memoised row is never rendered again for a new one.
  const refFor = useMemo(() => {
    const refs = new Map<string, (node: HTMLDivElement) => () => void>();
    return (id: string): ((node: HTMLDivElement) => () => void) => {
      const known = refs.get(id);
      if (known !== undefined) {
        return known;
      }
      const attach = (node: HTMLDivElement): (() => void) => {
        refs.set(id, attach);
        measured.set(node, id);
        observer.current?.observe(node);
        // A row can hold focus before it is attached: a control focused
        // while hydrating, or a row a new range mounts again.
        if (node.contains(node.ownerDocument.activeElement)) {
          range.retain(id);
        }
        return () => {
          observer.current?.unobserve(node);
          measured.delete(node);
          refs.delete(id);
        };
      };
      return attach;
    };
  }, [range, measured]);

  const onFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>): void => {
      const row = (event.target as Element).closest('[role="row"]');
      const id = row === null ? undefined : measured.get(row);
      if (id !== undefined) {
        range.retain(id);
      }
    },
    [range, measured],
  );

  // Focus that leaves the body lets its row go. Focus that leaves the
  // window has not left the body, and the row waits for its return.
  const onBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>): void => {
      const group = event.currentTarget;
      if (
        !group.contains(event.relatedTarget) &&
        group.ownerDocument.hasFocus()
      ) {
        range.retain(null);
      }
    },
    [range],
  );

  useLayoutEffect(() => {
    const viewport = viewportOf(body.current);
    reassert.current = false;
    let width: number | undefined;
    const resizes =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((records) => {
            const sizes: [string, number][] = [];
            let rowWidth = width;
            for (const record of records) {
              const id = measured.get(record.target);
              if (id !== undefined) {
                const [box] = record.borderBoxSize;
                sizes.push([id, box.blockSize]);
                rowWidth = box.inlineSize;
              }
            }
            // The rows share one width: a new one outdates every row not
            // mounted, whose height may have changed with it.
            const outdated =
              width !== undefined && rowWidth !== width
                ? range.invalidate("all")
                : 0;
            width = rowWidth;
            correct(outdated + range.measure(sizes));
            if (outdated !== 0) {
              reassert.current = true;
            }
            // Until a correction is made again, the viewport's scroll may
            // be one the browser held short of it: nothing to place from.
            if (!reassert.current) {
              place();
            }
          });
    observer.current = resizes;
    resizes?.observe(viewport);
    for (const element of measured.keys()) {
      resizes?.observe(element);
    }
    // The first placement comes before the store's own subscription, which
    // React takes after paint: render it now, so the first paint is right.
    const unplaced = range.get();
    place();
    if (range.get() !== unplaced) {
      refresh();
    }
    viewport.addEventListener("scroll", place);
    return () => {
      viewport.removeEventListener("scroll", place);
      resizes?.disconnect();
      observer.current = null;
    };
  }, [range, measured, place, correct]);

  // After the rows commit: make the scroll the entries asked for, and
  // forget the heights the change outdated — every row's not mounted when
  // the tracks re-wrap cells, otherwise those whose content was replaced.
  useLayoutEffect(() => {
    const before = previous.current;
    const after = { entries, model, tracks };
    previous.current = after;
    const outdated =
      before.tracks !== tracks
        ? range.invalidate("all")
        : before.model === model
          ? 0
          : range.invalidate(replaced(before, after));
    correct(shift.current + outdated);
    shift.current = 0;
    if (outdated !== 0) {
      reassert.current = true;
    }
  }, [range, entries, model, tracks, correct]);

  // Once the committed range is the range's own, its gaps have the heights
  // a correction for forgotten heights was worked out against: make it
  // again, where the page now holds it, and place the viewport from there.
  useLayoutEffect(() => {
    if (reassert.current && mounted === range.get()) {
      reassert.current = false;
      viewportOf(body.current).scrollTop = expected.current;
      place();
    }
  });

  return { mounted, body, refFor, onFocus, onBlur };
}
