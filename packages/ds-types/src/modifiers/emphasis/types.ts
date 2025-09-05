import type EMPHASIS from "./emphasis.js";

/**
 * A type definition for emphasis modifiers.
 * These modifiers can be used to change the emphasis of an element.
 * For a list of available modifiers, see {@link EMPHASIS}.
 */
export type Emphasis = (typeof EMPHASIS)[number];
