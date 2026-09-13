import { createIdentity, type Identity } from "../identity/index.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
  QueryCommand,
} from "../query/types.js";

/** Result of validating one text input. */
export type FieldValidation =
  | {
      readonly status: "valid";
      readonly operands: readonly PredicateOperand[];
    }
  | { readonly status: "incomplete" }
  | { readonly status: "invalid"; readonly reason: string };

/** Feedback a field control renders beside its input. */
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

/** Immutable interaction state of one filter field. */
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

/**
 * Create the interaction record for one filter field: it owns the input
 * input and its feedback, and produces addressed query commands. It never
 * owns the applied query — the coordinator does. A valid edit assumes its
 * returned command is dispatched and accepted; external authoritative
 * changes arrive through `setApplied`.
 */
export default function createFieldInteraction(
  config: FieldInteractionConfig,
): FieldInteraction {
  if (config.field === "" || config.field.includes("\u0000")) {
    throw new Error(
      "field interaction requires a non-empty field name without NUL characters",
    );
  }
  const identity = createIdentity();
  let input = "";
  let feedback: FieldFeedback = { status: "none" };
  let applied: Predicate | null = null;
  let snapshot = buildSnapshot();

  function buildSnapshot(): FieldInteractionState {
    return Object.freeze({ input, feedback, applied });
  }

  const predicateFrom = (operands: readonly PredicateOperand[]): Predicate => ({
    field: config.field,
    operator: config.operator,
    operands: [...operands],
  });

  return {
    identity,
    get state(): FieldInteractionState {
      return snapshot;
    },
    edit(next: string): QueryCommand | null {
      input = next;
      const validation = config.validate(next);
      if (validation.status === "valid") {
        feedback = { status: "applied" };
        applied = predicateFrom(validation.operands);
        snapshot = buildSnapshot();
        return {
          kind: "setPredicate",
          predicate: applied,
        };
      }
      if (validation.status === "incomplete") {
        feedback = { status: "incomplete" };
      } else {
        feedback = {
          status: "invalid",
          reason: validation.reason,
          retainsPredicate: applied !== null,
        };
      }
      snapshot = buildSnapshot();
      return null;
    },
    clear(): QueryCommand {
      input = "";
      feedback = { status: "none" };
      applied = null;
      snapshot = buildSnapshot();
      return {
        kind: "removePredicate",
        field: config.field,
        operator: config.operator,
      };
    },
    setApplied(nextApplied: Predicate | null): void {
      if (
        nextApplied !== null &&
        (nextApplied.field !== config.field ||
          nextApplied.operator !== config.operator)
      ) {
        throw new Error(
          `setApplied received a predicate for ${nextApplied.field}/${nextApplied.operator} on a ${config.field}/${config.operator} record`,
        );
      }
      applied = nextApplied;
      input = config.format ? config.format(nextApplied) : "";
      feedback = { status: "none" };
      snapshot = buildSnapshot();
    },
  };
}
