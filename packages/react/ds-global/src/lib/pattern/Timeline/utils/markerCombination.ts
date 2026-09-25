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

/** Explicit `marker.size` wins, then the derived size, then "medium". */
export function resolveMarkerSize(
  item: { marker?: { size?: TimelineMarkerSize } },
  derived: TimelineMarkerSize | undefined,
): TimelineMarkerSize {
  return item.marker?.size ?? derived ?? "medium";
}

/** Resolve each item's marker size from the combination rules. */
export function resolveMarkerSizes(
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
