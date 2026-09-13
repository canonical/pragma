import type { DisplayEntry } from "../rows/index.js";
import type { SizeIndex } from "./createSizeIndex.js";
import createSizeIndex from "./createSizeIndex.js";
import type {
  MountedRange,
  MountedRun,
  VirtualRange,
  VirtualRangeConfig,
} from "./types.js";

/** Entries mounted past each edge of the viewport, so the next is ready. */
const overscan = 4;

const emptyRange: MountedRange = Object.freeze({
  runs: Object.freeze([]),
  after: 0,
});

const sameRange = (a: MountedRange, b: MountedRange): boolean =>
  a.after === b.after &&
  a.runs.length === b.runs.length &&
  a.runs.every((run, position) => {
    const other = b.runs[position];
    return (
      run.start === other.start &&
      run.end === other.end &&
      run.before === other.before
    );
  });

/**
 * Create one table's virtual range.
 *
 * It is pure arithmetic over entry sizes: estimates until entries are
 * measured, then their measurements. It reads no DOM and schedules
 * nothing, so every framework binding shares it; the binding reports the
 * viewport and the measurements, and scrolls by the corrections returned.
 *
 * A scroll costs O(log n) and publishes only when the mounted entries or
 * the space around them change.
 */
export default function createVirtualRange(
  config: VirtualRangeConfig,
): VirtualRange {
  for (const [kind, estimate] of Object.entries(config.estimates)) {
    if (!Number.isFinite(estimate) || estimate <= 0) {
      throw new Error(`${kind} estimate must be a positive finite number`);
    }
  }
  const listeners = new Set<() => void>();
  const measured = new Map<string, number>();
  let entries: readonly DisplayEntry[] = [];
  let positions = new Map<string, number>();
  let sizes: SizeIndex = createSizeIndex([]);
  let start = 0;
  let size = 0;
  // The entry at the viewport's start, and how far into it the start is.
  let anchor: { readonly id: string; readonly within: number } | null = null;
  let retained: string | null = null;
  let current = emptyRange;

  // No anchor at the very top: new entries there are shown, not scrolled
  // past, as the browser's own scroll anchoring leaves them.
  const anchorAt = (offset: number): void => {
    const position = sizes.at(offset);
    anchor =
      entries.length === 0 || offset <= 0
        ? null
        : { id: entries[position].id, within: offset - sizes.offset(position) };
  };

  // Move the viewport by however far the sizes or entries before its
  // anchor moved the anchor, and report how far.
  const followAnchor = (): number => {
    const position = anchor === null ? undefined : positions.get(anchor.id);
    const moved =
      anchor === null || position === undefined
        ? 0
        : sizes.offset(position) + anchor.within - start;
    start += moved;
    return moved;
  };

  const compute = (): MountedRange => {
    const count = entries.length;
    if (count === 0) {
      return emptyRange;
    }
    const spans: [number, number][] = [
      [
        Math.max(0, sizes.at(start) - overscan),
        Math.min(count, sizes.at(start + size) + 1 + overscan),
      ],
    ];
    const kept = retained === null ? undefined : positions.get(retained);
    if (kept !== undefined) {
      const span: [number, number] = [
        Math.max(0, kept - 1),
        Math.min(count, kept + 2),
      ];
      const [main] = spans;
      if (span[1] < main[0]) {
        spans.unshift(span);
      } else if (span[0] > main[1]) {
        spans.push(span);
      } else {
        spans[0] = [Math.min(span[0], main[0]), Math.max(span[1], main[1])];
      }
    }
    let reached = 0;
    const runs: MountedRun[] = [];
    for (const [first, end] of spans) {
      runs.push(
        Object.freeze({
          start: first,
          end,
          before: sizes.offset(first) - sizes.offset(reached),
        }),
      );
      reached = end;
    }
    return Object.freeze({
      runs: Object.freeze(runs),
      after: sizes.offset(count) - sizes.offset(reached),
    });
  };

  const publish = (notify: boolean): void => {
    const next = compute();
    if (sameRange(current, next)) {
      return;
    }
    current = next;
    if (notify) {
      for (const listener of [...listeners]) {
        listener();
      }
    }
  };

  // After sizes change: keep the anchor in place, then tell the binding.
  const settle = (): number => {
    const moved = followAnchor();
    publish(true);
    return moved;
  };

  const mounted = (position: number): boolean =>
    current.runs.some((run) => run.start <= position && position < run.end);

  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setEntries(next) {
      if (next === entries) {
        return 0;
      }
      entries = next;
      positions = new Map(next.map((entry, position) => [entry.id, position]));
      for (const id of measured.keys()) {
        if (!positions.has(id)) {
          measured.delete(id);
        }
      }
      sizes = createSizeIndex(
        next.map(
          (entry) => measured.get(entry.id) ?? config.estimates[entry.kind],
        ),
      );
      if (retained !== null && !positions.has(retained)) {
        retained = null;
      }
      const moved = followAnchor();
      anchorAt(start);
      publish(false);
      return moved;
    },
    setViewport(nextStart, nextSize) {
      start = nextStart;
      size = Math.max(0, nextSize);
      anchorAt(start);
      publish(true);
    },
    measure(reported) {
      let changed = false;
      for (const [id, measuredSize] of reported) {
        const position = positions.get(id);
        if (position === undefined) {
          continue;
        }
        measured.set(id, measuredSize);
        if (sizes.size(position) !== measuredSize) {
          sizes.set(position, measuredSize);
          changed = true;
        }
      }
      return changed ? settle() : 0;
    },
    invalidate(ids) {
      let changed = false;
      for (const id of ids === "all" ? [...measured.keys()] : ids) {
        const position = positions.get(id);
        if (position === undefined || mounted(position) || !measured.has(id)) {
          continue;
        }
        measured.delete(id);
        const estimate = config.estimates[entries[position].kind];
        if (sizes.size(position) !== estimate) {
          sizes.set(position, estimate);
          changed = true;
        }
      }
      return changed ? settle() : 0;
    },
    retain(id) {
      retained = id !== null && positions.has(id) ? id : null;
      publish(true);
    },
  };
}
