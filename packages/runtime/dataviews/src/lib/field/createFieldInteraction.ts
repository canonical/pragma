import { createIdentity } from "../identity/index.js";
import type {
  Predicate,
  PredicateOperand,
  QueryCommand,
} from "../query/index.js";
import type {
  FieldFeedback,
  FieldInteraction,
  FieldInteractionConfig,
  FieldInteractionState,
} from "./types.js";

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
