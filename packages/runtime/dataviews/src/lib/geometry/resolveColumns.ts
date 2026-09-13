import type { ColumnToSize, FlexSizing, ResolvedColumn } from "./types.js";

/** A column's width while the solver runs. */
type Slot = { readonly id: string; width: number };

/** A flexible column paired with the slot the water-fill grows. */
type FlexEntry = { readonly slot: Slot; readonly sizing: FlexSizing };

const sizingRejection = (column: ColumnToSize): string | null => {
  const { sizing } = column;
  if (sizing.kind === "fixed") {
    if (!Number.isFinite(sizing.px) || sizing.px < 0) {
      return `column "${column.id}" needs a non-negative finite px`;
    }
    return null;
  }
  if (!Number.isFinite(sizing.weight) || sizing.weight < 0) {
    return `column "${column.id}" needs a non-negative finite weight`;
  }
  if (!Number.isFinite(sizing.minPx) || sizing.minPx < 0) {
    return `column "${column.id}" needs a non-negative finite minPx`;
  }
  if (sizing.maxPx !== undefined) {
    if (!Number.isFinite(sizing.maxPx) || sizing.maxPx < sizing.minPx) {
      return `column "${column.id}" needs maxPx ≥ minPx`;
    }
  }
  return null;
};

/**
 * Resolve one column-width vector: fixed columns reserve their declared px;
 * flexible columns reserve their minima, then share the remaining width by
 * weight until capped at maxPx, with unused shares redistributed among the
 * remaining flexible columns. When minima plus fixed widths exceed the
 * available width, declared widths are preserved (the container scrolls).
 * When every column is capped or fixed, leftover space stays unassigned.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function resolveColumns(
  columns: readonly ColumnToSize[],
  availableWidth: number,
): readonly ResolvedColumn[] {
  for (const column of columns) {
    const rejection = sizingRejection(column);
    if (rejection !== null) {
      throw new Error(rejection);
    }
  }
  if (!Number.isFinite(availableWidth) || availableWidth < 0) {
    throw new Error("available width must be a non-negative finite number");
  }

  // Seed every column at its reservation, so no later step needs a
  // missing-width fallback. Flex entries share the slot they grow.
  const slots: Slot[] = [];
  const flex: FlexEntry[] = [];
  let fixedTotal = 0;
  let minTotal = 0;
  for (const column of columns) {
    if (column.sizing.kind === "fixed") {
      slots.push({ id: column.id, width: column.sizing.px });
      fixedTotal += column.sizing.px;
    } else {
      const slot: Slot = { id: column.id, width: column.sizing.minPx };
      slots.push(slot);
      flex.push({ slot, sizing: column.sizing });
      minTotal += column.sizing.minPx;
    }
  }

  if (fixedTotal + minTotal >= availableWidth) {
    // Overflow: the reservations are the declared widths already.
    return toVector(slots);
  }

  let remaining = availableWidth - fixedTotal - minTotal;
  let active: readonly FlexEntry[] = flex;
  while (remaining > 0 && active.length > 0) {
    const totalWeight = active.reduce(
      (sum, entry) => sum + entry.sizing.weight,
      0,
    );
    if (totalWeight === 0) {
      break;
    }
    let spent = 0;
    const stillActive: FlexEntry[] = [];
    for (const entry of active) {
      const share = (remaining * entry.sizing.weight) / totalWeight;
      const maxPx = entry.sizing.maxPx;
      const headroom =
        maxPx === undefined
          ? Number.POSITIVE_INFINITY
          : maxPx - entry.slot.width;
      if (share <= headroom) {
        entry.slot.width += share;
        spent += share;
        stillActive.push(entry);
      } else {
        // Cap at maxPx without a non-null assertion: headroom is finite here.
        entry.slot.width += headroom;
        spent += headroom;
      }
    }
    if (spent === 0) {
      break;
    }
    remaining -= spent;
    active = stillActive;
  }

  return toVector(slots);
}

const toVector = (slots: readonly Slot[]): readonly ResolvedColumn[] =>
  slots.map(({ id, width }) => ({ id, width }));
