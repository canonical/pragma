export const MODIFIER_FAMILIES = {
  criticality: ["success", "error", "warning", "information"],
  anticipation: ["constructive", "destructive", "caution"],
  importance: ["primary", "secondary", "tertiary"],
  emphasis: ["muted", "branded"],
  // TODO: old modifier family. Remove severity after its no longer used
  severity: ["neutral", "positive", "negative", "caution", "information"],
  // compact is launchpad-only; the global density family is comfortable/dense
  density: ["comfortable", "dense", "compact"],
} as const satisfies Record<string, readonly string[]>;
