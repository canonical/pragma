import extractLocalName from "../../domains/shared/extractLocalName.js";
import {
  ABOX_PER_CLASS_LIMIT,
  ABOX_TOTAL_LIMIT,
  CLASS_PRIORITY,
  INDIVIDUAL_PRIORITY,
  NAME_SEPARATOR,
  PROPERTY_PRIORITY,
  RESOURCE_META_KEYS,
} from "./constants.js";
import type {
  GraphEntity,
  GraphIndex,
  ListedResource,
  ResourceListing,
} from "./types.js";

/** Longest description surfaced in a listing entry before truncation. */
const DESCRIPTION_MAX = 120;

/** Human-facing display name for an entity: its label, else its local name. */
function toDisplayName(entity: GraphEntity): string {
  return entity.label ?? extractLocalName(entity.uri);
}

/** Truncate a description to a listing-friendly length. */
function toShortDescription(text: string): string {
  return text.length > DESCRIPTION_MAX
    ? `${text.slice(0, DESCRIPTION_MAX - 3)}...`
    : text;
}

/** Sort entities by display name for stable, legible ordering. */
function byDisplayName(a: GraphEntity, b: GraphEntity): number {
  return toDisplayName(a).localeCompare(toDisplayName(b));
}

/** Build the listing entry for a TBox class, carrying its individual counts. */
function toClassResource(
  entity: GraphEntity,
  instanceCount: number,
  instancesShown: number,
): ListedResource {
  const truncated = instancesShown < instanceCount;
  const description = truncated
    ? `Schema class · showing ${instancesShown} of ${instanceCount} individuals; use autocomplete or graph_query for the rest`
    : `Schema class · ${instanceCount} individual${instanceCount === 1 ? "" : "s"}`;
  return {
    uri: entity.prefixed,
    name: `Class${NAME_SEPARATOR}${toDisplayName(entity)}`,
    description,
    mimeType: "application/json",
    annotations: { audience: ["assistant"], priority: CLASS_PRIORITY },
    _meta: {
      [RESOURCE_META_KEYS.box]: "tbox",
      [RESOURCE_META_KEYS.category]: "class",
      [RESOURCE_META_KEYS.instanceCount]: instanceCount,
      [RESOURCE_META_KEYS.instancesShown]: instancesShown,
      [RESOURCE_META_KEYS.truncated]: truncated,
    },
  };
}

/** Build the listing entry for a TBox property. */
function toPropertyResource(entity: GraphEntity): ListedResource {
  const construct = entity.types.find((t) => t.endsWith("Property"));
  const description = construct
    ? `Schema property · ${construct}`
    : "Schema property";
  return {
    uri: entity.prefixed,
    name: `Property${NAME_SEPARATOR}${toDisplayName(entity)}`,
    description,
    mimeType: "application/json",
    annotations: { audience: ["assistant"], priority: PROPERTY_PRIORITY },
    _meta: {
      [RESOURCE_META_KEYS.box]: "tbox",
      [RESOURCE_META_KEYS.category]: "property",
    },
  };
}

/** Build the listing entry for an ABox individual, grouped under its class. */
function toIndividualResource(entity: GraphEntity): ListedResource {
  const group = entity.primaryTypeLabel ?? "Individual";
  const summary = entity.description
    ? toShortDescription(entity.description)
    : null;
  const description = summary ? `${group}${NAME_SEPARATOR}${summary}` : group;
  return {
    uri: entity.prefixed,
    name: `${group}${NAME_SEPARATOR}${toDisplayName(entity)}`,
    description,
    mimeType: "application/json",
    annotations: { audience: ["assistant"], priority: INDIVIDUAL_PRIORITY },
    _meta: {
      [RESOURCE_META_KEYS.box]: "abox",
      [RESOURCE_META_KEYS.category]: "individual",
      [RESOURCE_META_KEYS.type]: entity.primaryType ?? null,
    },
  };
}

/**
 * Build the ordered, categorized, capped MCP resource listing from the index.
 *
 * TBox schema comes first and in full (classes, then properties) so a consumer
 * sees the schema without scrolling past every instance. ABox individuals
 * follow, grouped by class and sorted, capped per class ({@link
 * ABOX_PER_CLASS_LIMIT}) and overall ({@link ABOX_TOTAL_LIMIT}). Dropped
 * individuals are reported in the returned {@link ResourceListing.truncation}
 * and reflected in each class entry's count metadata — never silently lost.
 *
 * @param index - The graph index of classified subjects.
 * @returns The resource entries and a summary of any capping.
 */
export default function buildResourceList(index: GraphIndex): ResourceListing {
  const classes = index.entities
    .filter((e) => e.category === "class")
    .sort(byDisplayName);
  const properties = index.entities
    .filter((e) => e.category === "property")
    .sort(byDisplayName);
  const individuals = index.entities.filter((e) => e.category === "individual");

  const groups = new Map<string, GraphEntity[]>();
  for (const individual of individuals) {
    const key = individual.primaryType ?? "";
    const bucket = groups.get(key) ?? [];
    bucket.push(individual);
    groups.set(key, bucket);
  }

  const orderedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const shownByType = new Map<string, number>();
  const droppedByType = new Map<string, number>();
  const individualResources: ListedResource[] = [];
  let totalShown = 0;

  for (const key of orderedKeys) {
    const bucket = (groups.get(key) ?? []).sort(byDisplayName);
    let groupShown = 0;
    for (const individual of bucket) {
      const atGlobalCap = totalShown >= ABOX_TOTAL_LIMIT;
      const atClassCap = groupShown >= ABOX_PER_CLASS_LIMIT;
      if (atGlobalCap || atClassCap) {
        droppedByType.set(key, (droppedByType.get(key) ?? 0) + 1);
        continue;
      }
      individualResources.push(toIndividualResource(individual));
      groupShown += 1;
      totalShown += 1;
    }
    shownByType.set(key, groupShown);
  }

  const classResources = classes.map((entity) =>
    toClassResource(
      entity,
      (shownByType.get(entity.prefixed) ?? 0) +
        (droppedByType.get(entity.prefixed) ?? 0),
      shownByType.get(entity.prefixed) ?? 0,
    ),
  );

  const totalDropped = [...droppedByType.values()].reduce((a, b) => a + b, 0);

  return {
    resources: [
      ...classResources,
      ...properties.map(toPropertyResource),
      ...individualResources,
    ],
    truncation: { totalDropped, droppedByType },
  };
}
