import type {
  PredicateOperator,
  ProviderFieldHandle,
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
  /** The provider handle for this field's lower or upper bound. */
  readonly handle: ProviderFieldHandle<number | string>;
  /** The field's visible name; the bound's own wording is added to it. */
  readonly label: string;
  /** Which bound this control edits. */
  readonly bound: Extract<PredicateOperator, "gte" | "lte">;
  /** The field's kind, which decides the control. */
  readonly kind: Extract<SchemaFieldDefinition["kind"], "number" | "date">;
  /**
   * Whether the source declares this bound. An undeclared one is offered
   * only while it stands, and only for removal.
   */
  readonly declared: boolean;
};
