export const MODIFIER_FAMILIES = {
  severity: ["neutral", "positive", "negative", "caution", "information"],
  density: ["dense", "compact", "medium"],
} as const satisfies Record<string, readonly string[]>;
