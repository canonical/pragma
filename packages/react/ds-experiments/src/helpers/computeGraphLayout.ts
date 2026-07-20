import type { EntityKind, GraphEntity, GraphPosition } from "../graph/types.js";

/** Tuning for {@link computeGraphLayout}; every value is in canvas pixels. */
export interface GraphLayoutOptions {
  /** Horizontal distance between category columns. */
  readonly columnGap?: number;
  /** Vertical distance between entities stacked in a column. */
  readonly rowGap?: number;
  /** Inset of the whole layout from the top-left origin. */
  readonly origin?: GraphPosition;
}

const DEFAULT_COLUMN_GAP = 260;
const DEFAULT_ROW_GAP = 120;
const DEFAULT_ORIGIN: GraphPosition = { x: 0, y: 0 };

/**
 * Column order, left to right. Standards sit upstream of the concepts they
 * define, which sit upstream of the components and tokens that realise them —
 * so reading the canvas left to right roughly follows governance flowing into
 * implementation.
 */
const COLUMN_ORDER: readonly EntityKind[] = [
  "STANDARD",
  "CONCEPT",
  "COMPONENT",
  "TOKEN",
];

const columnIndexOf = (kind: string): number => {
  const index = COLUMN_ORDER.indexOf(kind as EntityKind);
  // Unknown kinds fall into a trailing column of their own rather than
  // collapsing onto STANDARD at index 0.
  return index === -1 ? COLUMN_ORDER.length : index;
};

/**
 * Computes a deterministic position for every entity: category chooses the
 * column, arrival order chooses the row within it. Deterministic in, deterministic
 * out — no clocks, no randomness — so stories and visual snapshots are stable.
 *
 * This is intentionally a simple layered placement, not a force-directed or
 * hierarchical solver; it is the honest default for a first playground, and the
 * seam where a real layout engine (e.g. elkjs) would later slot in. Callers that
 * have curated coordinates should pass them to `GraphCanvas` directly and skip
 * this entirely.
 */
const computeGraphLayout = (
  entities: readonly GraphEntity[],
  options: GraphLayoutOptions = {},
): Map<string, GraphPosition> => {
  const columnGap = options.columnGap ?? DEFAULT_COLUMN_GAP;
  const rowGap = options.rowGap ?? DEFAULT_ROW_GAP;
  const origin = options.origin ?? DEFAULT_ORIGIN;

  const rowByColumn = new Map<number, number>();
  const positions = new Map<string, GraphPosition>();

  for (const entity of entities) {
    const column = columnIndexOf(entity.kind);
    const row = rowByColumn.get(column) ?? 0;
    rowByColumn.set(column, row + 1);

    positions.set(entity.id, {
      x: origin.x + column * columnGap,
      y: origin.y + row * rowGap,
    });
  }

  return positions;
};

export default computeGraphLayout;
