import type {
  Count,
  FilterHandle,
  PredicateOperand,
  PredicateOperator,
} from "@canonical/dataviews-core";
import type { ProviderHost } from "@canonical/dataviews-core/bindings";

/** The operators a closed-set filter edits. */
type ChoicesOperator = Extract<PredicateOperator, "isAny" | "isNone">;

/**
 * Props of one closed-set filter.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the schema field it was built for, not forwarding
 * a caller's native props.
 */
export type ChoicesFilterProps = {
  /**
   * The options the control lists, in order: the schema's, or, where the
   * options are the server's, those the latest facet lists, as text.
   */
  readonly options: readonly (string | number)[];
  /**
   * Whether the options are the server's: the set may then hold one no facet
   * lists yet, which is listed beside them so a restriction in force is never
   * hidden.
   */
  readonly serverOwned: boolean;
  /**
   * How many matching records hold each option, keyed by its text, from the
   * facet answering the applied query, or null while none does.
   */
  readonly counts: ReadonlyMap<string, Count> | null;
  /** The root's handle for this field's predicate under `operator`. */
  readonly handle: FilterHandle<ReadonlySet<PredicateOperand>>;
  /** Which set the control edits: the options a value is any or none of. */
  readonly operator: ChoicesOperator;
  /**
   * Whether the source declares the other set operator on the field, which a
   * set standing here may move to.
   */
  readonly alternativeDeclared: boolean;
  /**
   * The root's handle for the field's predicate under the other set
   * operator: a set moves there only while nothing stands there, so a move
   * never overwrites a restriction in force.
   */
  readonly alternativeHandle: FilterHandle<ReadonlySet<PredicateOperand>>;
  /** The provider's host, which moves a set and spells where a move leads. */
  readonly host: Pick<ProviderHost, "state" | "setPredicate" | "spellQuery">;
  /** The field's visible name; the group's legend. */
  readonly label: string;
  /** The field the control addresses, which names its checkboxes. */
  readonly field: string;
  /**
   * Whether the source declares this field's predicate under `operator`. An
   * undeclared one is offered only while it stands, and only for removal.
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
   * Place focus when the control leaves with the restriction it removed or
   * moved, or disables the checkbox that had focus, as an undeclared one
   * does once an option is unchecked: the parent owns where it goes.
   */
  readonly onLeave: () => void;
};
