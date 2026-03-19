/**
 * Component domain types.
 *
 * Reused across component commands, formatters, and aspect resolution.
 */

export interface AspectFlags {
  readonly anatomy: boolean;
  readonly modifiers: boolean;
  readonly tokens: boolean;
  readonly standards: boolean;
  readonly implementations: boolean;
}
