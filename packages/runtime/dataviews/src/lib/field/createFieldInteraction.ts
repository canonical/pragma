import createIdentity, { type Identity } from "../createIdentity.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
  QueryCommand,
} from "../query/types.js";

/** Result of validating one input buffer. */
export type FieldValidation =
  | {
      readonly status: "valid";
      readonly operands: readonly PredicateOperand[];
    }
  | { readonly status: "incomplete" }
  | { readonly status: "invalid"; readonly reason: string };

/** Feedback a field control renders beside its buffer. */
export type FieldFeedback =
  | { readonly kind: "none" }
  | { readonly kind: "applied" }
  | { readonly kind: "incomplete" }
  | {
      readonly kind: "invalid";
      readonly reason: string;
      /** True when a prior applied predicate is still restricting results. */
      readonly retainsPredicate: boolean;
    };

/** Immutable interaction state of one filter field. */
export type FieldInteractionState = {
  readonly buffer: string;
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
   * Validate an input buffer. `incomplete` retains the applied predicate
   * with local feedback; `invalid` retains it with the prior-restriction
   * note; `valid` produces the addressed replacement command.
   */
  readonly validate: (buffer: string) => FieldValidation;
  /**
   * Optional formatter deriving a buffer from an applied predicate on
   * external query changes. Without it, external changes clear the buffer.
   */
  readonly format?: (applied: Predicate | null) => string;
};

/** Handle of one field interaction record, addressed by field and operator. */
export type FieldInteraction = {
  readonly identity: Identity;
  readonly state: FieldInteractionState;
  /**
   * Edit the input buffer. Returns the addressed replacement command when
   * the buffer is valid, and null when the buffer is invalid or incomplete —
   * in both cases the applied predicate is retained.
   */
  readonly edit: (buffer: string) => QueryCommand | null;
  /** Explicitly remove the addressed predicate. Always returns the command. */
  readonly clear: () => QueryCommand;
  /**
   * Adopt the authoritative applied predicate (external query or history
   * change). Stale buffers and feedback are discarded, never replayed; the
   * predicate must address this record's field and operator.
   */
  readonly setApplied: (applied: Predicate | null) => void;
};

/**
 * Create the interaction record for one filter field: it owns the input
 * buffer and its feedback, and produces addressed query commands. It never
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
  let buffer = "";
  let feedback: FieldFeedback = { kind: "none" };
  let applied: Predicate | null = null;
  let snapshot = buildSnapshot();

  function buildSnapshot(): FieldInteractionState {
    return Object.freeze({ buffer, feedback, applied });
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
    edit(nextBuffer: string): QueryCommand | null {
      buffer = nextBuffer;
      const validation = config.validate(nextBuffer);
      if (validation.status === "valid") {
        feedback = { kind: "applied" };
        applied = predicateFrom(validation.operands);
        snapshot = buildSnapshot();
        return {
          kind: "replacePredicate",
          predicate: applied,
        };
      }
      if (validation.status === "incomplete") {
        feedback = { kind: "incomplete" };
      } else {
        feedback = {
          kind: "invalid",
          reason: validation.reason,
          retainsPredicate: applied !== null,
        };
      }
      snapshot = buildSnapshot();
      return null;
    },
    clear(): QueryCommand {
      buffer = "";
      feedback = { kind: "none" };
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
      buffer = config.format ? config.format(nextApplied) : "";
      feedback = { kind: "none" };
      snapshot = buildSnapshot();
    },
  };
}
