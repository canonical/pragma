import type SEVERITY from "./severity.js";

/**
 * The severity levels available for components.
 * These are used to modify the appearance of components based on the type of message they convey.
 * The levels themselves are defined in {@link SEVERITY}, which can be used to access the raw values as an array (for instance, for mapping over them).
 */
export type Severity = (typeof SEVERITY)[number];
