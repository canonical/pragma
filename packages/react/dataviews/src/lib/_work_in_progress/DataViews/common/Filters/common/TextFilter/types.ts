import type { FilterHandle } from "@canonical/dataviews-core";

/**
 * Props of one text filter.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the schema field it was built for, not forwarding
 * a caller's native props.
 */
export type TextFilterProps = {
  /** The root's handle for the text this field must contain. */
  readonly handle: FilterHandle<string>;
  /** The field's visible name; the operator's wording is added to it. */
  readonly label: string;
  /** The field the control addresses, which names its input. */
  readonly field: string;
  /**
   * Whether the source declares `contains` on this field. An undeclared one
   * is offered only while it stands, and only for removal.
   */
  readonly declared: boolean;
  /**
   * Place focus when the control leaves with the restriction it removed,
   * as an undeclared one does once cleared: the parent owns where it goes.
   */
  readonly onLeave: () => void;
};
