import type {
  Facet,
  FilterHandle,
  PredicateOperand,
  PredicateOperator,
} from "@canonical/dataviews-core";
import type { ProviderHost } from "@canonical/dataviews-core/bindings";

/** One value a values facet lists, with its count. */
type FacetValue = Extract<Facet, { readonly kind: "values" }>["values"][number];

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
   * The field's option values, in schema order; undefined where the options
   * are the server's, which the facet then lists.
   */
  readonly options: readonly (string | number)[] | undefined;
  /**
   * The values the source's facet over the field lists, each with its count,
   * or null while no facet answers the applied query.
   */
  readonly values: readonly FacetValue[] | null;
  /** The root's handle for this field's predicate under `operator`. */
  readonly handle: FilterHandle<ReadonlySet<PredicateOperand>>;
  /** Which set the control edits: the options a value is any or none of. */
  readonly operator: ChoicesOperator;
  /**
   * The other set operator the source declares on the field, which a set
   * standing here may move to, or null when it declares none.
   */
  readonly alternative: ChoicesOperator | null;
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
   * Whether the control is offered while nothing stands: the any-of set
   * wherever it is declared, the none-of set only where any-of is not.
   */
  readonly offered: boolean;
  /**
   * Place focus when the control leaves with the restriction it removed or
   * moved, or disables the checkbox that had focus, as an undeclared one
   * does once an option is unchecked: the parent owns where it goes.
   */
  readonly onLeave: () => void;
};
