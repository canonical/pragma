/**
 * The filter field interaction: the validation an input gets, the feedback
 * a control shows and the state one field record holds. Together because a
 * control reads them together, beside one input.
 */

import type { Identity } from "../identity/index.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
  QueryCommand,
} from "../query/index.js";
/**
 * Result of validating one text input.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FieldValidation =
  | {
      readonly status: "valid";
      readonly operands: readonly PredicateOperand[];
    }
  | { readonly status: "incomplete" }
  | { readonly status: "invalid"; readonly reason: string };

/**
 * Feedback a field control renders beside its input.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FieldFeedback =
  | { readonly status: "none" }
  | { readonly status: "applied" }
  | { readonly status: "incomplete" }
  | {
      readonly status: "invalid";
      readonly reason: string;
      /** True when a prior applied predicate is still restricting results. */
      readonly retainsPredicate: boolean;
    };

/**
 * Immutable interaction state of one filter field.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FieldInteractionState = {
  readonly input: string;
  readonly feedback: FieldFeedback;
  readonly applied: Predicate | null;
};

/** Configuration of one filter field interaction record. */
export type FieldInteractionConfig = {
  /** Field name the interaction addresses; must not be empty. */
  readonly field: string;
  /** Operator the interaction addresses. */
  readonly operator: PredicateOperator;
  /**
   * Validate a text input. `incomplete` retains the applied predicate
   * with local feedback; `invalid` retains it with the prior-restriction
   * note; `valid` produces the addressed replacement command.
   */
  readonly validate: (input: string) => FieldValidation;
  /**
   * Optional formatter deriving an input from an applied predicate on
   * external query changes. Without it, external changes clear the input.
   */
  readonly format?: (applied: Predicate | null) => string;
};

/** Handle of one field interaction record, addressed by field and operator. */
export type FieldInteraction = {
  readonly identity: Identity;
  readonly state: FieldInteractionState;
  /**
   * Edit the text input. Returns the addressed replacement command when
   * the input is valid, and null when the input is invalid or incomplete —
   * in both cases the applied predicate is retained.
   */
  readonly edit: (input: string) => QueryCommand | null;
  /** Explicitly remove the addressed predicate. Always returns the command. */
  readonly clear: () => QueryCommand;
  /**
   * Adopt the authoritative applied predicate (external query or history
   * change). Stale inputs and feedback are discarded, never replayed; the
   * predicate must address this record's field and operator.
   */
  readonly setApplied: (applied: Predicate | null) => void;
};
