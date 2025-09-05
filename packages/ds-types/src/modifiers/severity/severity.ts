/**
 * Severity levels for UI components.
 * These levels are used to indicate the nature of messages or statuses conveyed by components.
 * This is a constant that allows mapping over the raw severity values, which may be useful in certain scenarios.
 * For a severity type definition, use {@link Severity}.
 */
const SEVERITY = [
  "neutral",
  "positive",
  "negative",
  "caution",
  "information",
] as const;

export default SEVERITY;
