/**
 * Block domain types.
 *
 * Reused across block commands, formatters, and aspect resolution.
 */

/** Flags controlling which detail aspects are included in block output. */
export interface AspectFlags {
  readonly anatomy: boolean;
  readonly modifiers: boolean;
  readonly tokens: boolean;
  readonly implementations: boolean;
}
