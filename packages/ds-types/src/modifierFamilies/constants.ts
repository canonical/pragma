export const MODIFIER_FAMILIES = {
  /** @implements ds:global.modifier_family.anticipation */
  anticipation: ["constructive", "caution", "destructive"],
  /** @implements ds:global.modifier_family.criticality */
  criticality: ["success", "error", "warning", "information"],
  /** @implements ds:global.modifier_family.density */
  density: ["dense", "comfortable"],
  /** @implements ds:global.modifier_family.emphasis */
  emphasis: ["primary", "secondary", "tertiary"],
  /** @implements ds:global.modifier_family.importance */
  importance: ["primary", "secondary", "tertiary"],
  /** @implements ds:global.modifier_family.lifecycle */
  lifecycle: ["planned", "in_progress", "completed", "failed"],
  /** @implements ds:global.modifier_family.release */
  release: ["alpha", "beta", "experimental", "stable"],
  /** @implements ds:global.modifier_family.severity */
  severity: ["neutral", "positive", "negative", "caution", "information"],
} as const;
