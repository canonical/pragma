import type {
  FilterHandle,
  PredicateOperator,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";

/**
 * Props of one bound filter.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the schema field it was built for, not forwarding
 * a caller's native props.
 */
export type BoundFilterProps = {
  /** The root's handle for this field's lower or upper bound. */
  readonly handle: FilterHandle<number | string>;
  /** The field's visible name; the bound's own wording is added to it. */
  readonly label: string;
  /** Which bound this control edits. */
  readonly bound: Extract<PredicateOperator, "gte" | "lte">;
  /** The field's definition: its kind decides the control, its bounds the input's. */
  readonly definition: Extract<
    SchemaFieldDefinition,
    { readonly kind: "number" | "date" }
  >;
  /**
   * The value the hint offers for this bound — the least the records matching
   * the query hold for a lower bound, the greatest for an upper — from the
   * source's facet over the field with its own bounds lifted, or null while
   * no facet answers the applied query or no record holds one.
   */
  readonly offered: string | number | null;
  /**
   * Whether the source declares this bound. An undeclared one is offered
   * only while it stands, and only for removal.
   */
  readonly declared: boolean;
  /**
   * Whether focus goes to the parent once the restriction the control clears
   * was the field's last: the control is about to leave — an undeclared
   * restriction, or a field shown only because it is restricted, under
   * primary filters — rather than stay where focus could return to it.
   */
  readonly leavesWhenCleared: boolean;
  /**
   * Place focus when the control leaves with the restriction it removed,
   * as an undeclared one does once cleared: the parent owns where it goes.
   */
  readonly onLeave: () => void;
};
