import type {
  PredicateOperand,
  ProviderFieldHandle,
} from "@canonical/dataviews-core";

/**
 * Props of one closed-set filter.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the schema field it was built for, not forwarding
 * a caller's native props.
 */
export type ChoicesFilterProps = {
  /** The field's option values, in schema order. */
  readonly options: readonly (string | number)[];
  /** The provider handle for this field's equality predicate. */
  readonly handle: ProviderFieldHandle<ReadonlySet<PredicateOperand>>;
  /** The group's visible name. */
  readonly label: string;
  /**
   * Whether the source declares this field's equality predicate. An undeclared
   * one is offered only while it stands, and only for removal.
   */
  readonly declared: boolean;
};
