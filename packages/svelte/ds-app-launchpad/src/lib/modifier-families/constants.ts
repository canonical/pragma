export const MODIFIER_FAMILIES = {
  criticality: ["success", "error", "warning", "information"],
  // TODO: old modifier family. Remove severity after its no longer used
  severity: ["neutral", "positive", "negative", "caution", "information"],
  // TODO: new modifier family is also used density, but the values
  // are different. Keep in mind when updating a component that uses it
  // New values: comfortable, dense
  density: ["dense", "compact", "medium"],
} as const satisfies Record<string, readonly string[]>;
