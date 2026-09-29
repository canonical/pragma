import type {
  TimelineItem,
  TimelineMarkerCombination,
  TimelineMarkerSize,
} from "../types.js";

function firstIndexesOfRuns(
  values: readonly (string | undefined)[],
): Set<number> {
  const firsts = new Set<number>();
  let previous: string | undefined;
  values.forEach((value, index) => {
    if (value === undefined) {
      previous = undefined;
    } else if (value !== previous) {
      firsts.add(index);
      previous = value;
    }
  });
  return firsts;
}

/** Marker sizes from the combination rules alone, before per-item overrides. */
function deriveMarkerSizes(
  items: readonly TimelineItem[],
  combination: TimelineMarkerCombination,
): TimelineMarkerSize[] {
  if (
    combination === "large" ||
    combination === "medium" ||
    combination === "small"
  ) {
    return items.map(() => combination);
  }

  const actorRunStarts = firstIndexesOfRuns(items.map((item) => item.actorId));

  if (combination === "large-medium" || combination === "large-small") {
    const rest = combination === "large-medium" ? "medium" : "small";
    return items.map((_, index) =>
      actorRunStarts.has(index) ? "large" : rest,
    );
  }

  if (combination === "medium-small") {
    return items.map((_, index) =>
      actorRunStarts.has(index) ? "medium" : "small",
    );
  }

  const typeRunStarts = firstIndexesOfRuns(items.map((item) => item.eventType));
  return items.map((_, index) => {
    if (actorRunStarts.has(index)) {
      return "large";
    }
    if (typeRunStarts.has(index)) {
      return "medium";
    }
    return "small";
  });
}

/**
 * Resolve each item's marker size from the combination rules. An explicit
 * `marker.size` on the item wins over the derived size.
 */
export default function resolveMarkerSizes(
  items: readonly TimelineItem[],
  combination: TimelineMarkerCombination,
): TimelineMarkerSize[] {
  const derived = deriveMarkerSizes(items, combination);
  return items.map((item, index) => item.marker?.size ?? derived[index]);
}
