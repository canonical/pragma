import type { FieldHandle } from "@canonical/dataviews-core";

/**
 * Props of one presence filter.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the schema field it was built for, not forwarding
 * a caller's native props.
 */
export type FlagFilterProps = {
  /** The provider handle for this field's presence predicate. */
  readonly handle: FieldHandle<boolean>;
  /** The field's visible name. */
  readonly label: string;
  /**
   * Whether the source declares this field's presence predicate. An undeclared
   * one is offered only while it stands, and only for removal.
   */
  readonly declared: boolean;
};
