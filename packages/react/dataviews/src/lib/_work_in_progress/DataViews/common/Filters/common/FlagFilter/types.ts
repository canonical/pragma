import type { FilterHandle } from "@canonical/dataviews-core";

/**
 * Props of one presence filter.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the schema field it was built for, not forwarding
 * a caller's native props.
 */
export type FlagFilterProps = {
  /** The root's handle for this field's presence predicate. */
  readonly handle: FilterHandle<boolean>;
  /** The field's visible name. */
  readonly label: string;
  /** The field the control addresses, which names its checkbox. */
  readonly field: string;
  /**
   * Whether the source declares this field's presence predicate. An undeclared
   * one is offered only while it stands, and only for removal.
   */
  readonly declared: boolean;
  /**
   * Place focus when the control leaves with the restriction it removed,
   * as an undeclared one does once unchecked: the parent owns where it goes.
   */
  readonly onLeave: () => void;
};
