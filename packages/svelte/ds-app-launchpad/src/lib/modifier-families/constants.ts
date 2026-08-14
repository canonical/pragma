export const MODIFIER_FAMILIES = {
  criticality: ["success", "error", "warning", "information"],
  severity: ["neutral", "positive", "negative", "caution", "information"],
  density: ["dense", "compact", "medium"],
} as const satisfies Record<string, readonly string[]>;
