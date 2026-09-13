import { createChannel, protectChannel } from "../observable/index.js";
import type { Predicate, PredicateOperand } from "../query/index.js";
import type { SourceRefusal } from "../result/index.js";
import { type EmptyOr, resolveFieldKind } from "../schema/index.js";
import isSamePredicate from "./isSamePredicate.js";
import type {
  FilterFeedback,
  FilterInput,
  FilterInputConfig,
  FilterInputState,
} from "./types.js";

/**
 * Create the record for one filter address: it owns the text input and its
 * feedback, applies a valid predicate through the host's predicate
 * commands, and mirrors the applied value. It never owns the applied
 * query — the provider does — so the query moving under it arrives
 * through `setApplied`.
 *
 * A valid edit the source refuses applies nothing: the predicate already
 * in force stays, and the feedback carries the coded refusals.
 *
 * @note Impure by design: the record holds the input a person is still
 * typing and publishes its channels; the host commands it calls move the
 * provider's query.
 */
export default function createFilterInput(
  config: FilterInputConfig,
): FilterInput {
  const { schema, field, operator, host } = config;
  const definition = schema.findField(field);
  if (definition === undefined) {
    throw new Error(`the schema has no field "${field}" to filter`);
  }
  const kind = resolveFieldKind(definition.kind);
  const isApplied = (a: EmptyOr<unknown>, b: EmptyOr<unknown>): boolean =>
    a.kind === "empty" || b.kind === "empty"
      ? a.kind === b.kind
      : kind.areAppliedEqual(a.value, b.value);

  let input = "";
  let feedback: FilterFeedback = { status: "none" };
  let applied: Predicate | null = null;
  /**
   * The predicate on its way to the host. The host publishes before
   * `setPredicate` returns, and the records' sync then offers this record
   * the canonical copy of its own edit as if the query had moved under it;
   * the copy is recognised here and left alone.
   */
  let applying: Predicate | null = null;
  const state = createChannel<FilterInputState>(
    Object.freeze({ input, feedback }),
  );
  const appliedValue = createChannel<EmptyOr<unknown>>(
    { kind: "empty" },
    { equals: isApplied },
  );

  const publish = (): void => {
    state.set(Object.freeze({ input, feedback }));
    appliedValue.set(
      applied === null
        ? { kind: "empty" }
        : { kind: "value", value: kind.readApplied(applied) },
    );
  };

  /** Apply one predicate through the host; the feedback says how it went. */
  const apply = (predicate: Predicate): readonly SourceRefusal[] => {
    applying = predicate;
    let refusals: readonly SourceRefusal[];
    try {
      refusals = host.setPredicate(predicate);
    } finally {
      applying = null;
    }
    if (refusals.length > 0) {
      feedback = {
        status: "refused",
        refusals,
        retainsPredicate: applied !== null,
      };
    } else {
      applied = predicate;
      feedback = { status: "applied" };
    }
    publish();
    return refusals;
  };

  return {
    get predicate(): Predicate | null {
      return applied;
    },
    state: protectChannel(state),
    applied: protectChannel(appliedValue),
    edit(next: string): void {
      input = next;
      const validation = schema.validateInput(field, next);
      if (validation.status === "valid") {
        apply({ field, operator, operands: [...validation.operands] });
        return;
      }
      feedback =
        validation.status === "incomplete"
          ? { status: "incomplete" }
          : {
              status: "invalid",
              reason: validation.reason,
              retainsPredicate: applied !== null,
            };
      publish();
    },
    set(operands: readonly PredicateOperand[]): readonly SourceRefusal[] {
      const built = schema.predicateFor(field, operator, operands);
      if (built.status !== "valid") {
        feedback = {
          status: "invalid",
          reason: built.reason,
          retainsPredicate: applied !== null,
        };
        publish();
        return [];
      }
      input = "";
      return apply(built.predicate);
    },
    clear(): readonly SourceRefusal[] {
      const refusals = host.removePredicate(field, operator);
      input = "";
      feedback = { status: "none" };
      applied = null;
      publish();
      return refusals;
    },
    setApplied(next: Predicate | null): void {
      if (
        next !== null &&
        (next.field !== field || next.operator !== operator)
      ) {
        throw new Error(
          `setApplied received a predicate for ${next.field}/${next.operator} on a ${field}/${operator} record`,
        );
      }
      if (applying !== null && isSamePredicate(next, applying)) {
        // The record's own edit, coming back as the provider's copy: the
        // input under the cursor and the feedback are what the edit made.
        return;
      }
      applied = next;
      input = next === null ? "" : String(next.operands.at(0) ?? "");
      feedback = { status: "none" };
      publish();
    },
  };
}
