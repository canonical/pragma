/**
 * A color pair for domain-aware TUI rendering.
 *
 * Maps chalk color method names — `classBg` for background colors
 * on class-level labels, `instanceFg` for text colors on instance values.
 */
export interface DomainColorPair {
  /** Chalk background color name for class-level labels. */
  readonly classBg: string;
  /** Chalk text color name for instance values. */
  readonly instanceFg: string;
}
