import type { FilterFeedback } from "@canonical/dataviews-core";
import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId } from "react";
import { composeSentence } from "../../../../../../utils/index.js";
import { useFilterHandle } from "../../../../hooks/index.js";
import type { BoundFilterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-filters-bound";

const BOUND_WORDING = { gte: "from", lte: "to" } as const;

const STILL_APPLIES = "The previous restriction still applies.";

/**
 * What to say beside the input, or null when there is nothing to say.
 *
 * An invalid or emptied edit retains the applied predicate, so the message
 * says the prior restriction still applies: the results on screen are
 * still filtered and the text on screen is not what filtered them.
 */
const feedbackTextOf = (
  feedback: FilterFeedback,
  retained: boolean,
): string | null => {
  switch (feedback.status) {
    case "none":
    case "applied":
      return null;
    case "incomplete":
      return retained
        ? `Enter a value to change this restriction. ${STILL_APPLIES}`
        : "Enter a value to apply this restriction.";
    case "invalid":
      return feedback.retainsPredicate
        ? `${composeSentence(feedback.reason)} ${STILL_APPLIES}`
        : composeSentence(feedback.reason);
    case "refused": {
      // Every reason the source gave, each as its own sentence.
      const reasons = feedback.refusals
        .map((refusal) => composeSentence(refusal.reason))
        .join(" ");
      return feedback.retainsPredicate
        ? `${reasons} ${STILL_APPLIES}`
        : reasons;
    }
  }
};

/**
 * One bound of a number or date field.
 *
 * Emptying the input is incomplete, not a removal: the applied bound stays
 * until it is explicitly cleared, which is what the clear control is for. A
 * number is a native number input carrying the schema's bounds, so the
 * browser validates it before any script runs and the same bounds the
 * schema enforces are the ones it announces; a date is a native date input.
 * The control is named as the wire spells the clause, so a GET submission
 * is the same destination the edit writes.
 */
export default function BoundFilter({
  handle,
  label,
  bound,
  definition,
  declared,
}: BoundFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  const inputId = useId();
  const retained = field.applied.kind === "value";
  if (!declared && !retained) {
    return null;
  }
  const feedbackId = `${inputId}-feedback`;
  const message = feedbackTextOf(field.feedback, retained);
  const name = `${label} ${BOUND_WORDING[bound]}`;
  // The schema's bounds, natively: an out-of-range value is refused by the
  // browser at baseline and by the schema once scripted.
  const native =
    definition.kind === "number"
      ? {
          type: "number",
          min: definition.min,
          max: definition.max,
          step: "any",
        }
      : { type: "date" };
  return (
    <div className={componentCssClassName}>
      <label htmlFor={inputId} className="label">
        {name}
      </label>
      <input
        id={inputId}
        className="input"
        {...native}
        name={spellWireKey(definition.field, bound)}
        value={field.input}
        // Undeclared, the bound can only be cleared, never replaced.
        readOnly={!declared}
        aria-invalid={
          field.feedback.status === "invalid" ||
          field.feedback.status === "refused"
        }
        aria-describedby={message === null ? undefined : feedbackId}
        onChange={(event) => {
          // A number input hands over nothing while its text is not yet a
          // number — "-", "1e": nothing is edited until it is one, so the
          // applied bound and its message stand.
          if (event.target.validity.badInput) {
            return;
          }
          field.edit(event.target.value);
        }}
      />
      {retained ? (
        <Button
          type="button"
          importance="tertiary"
          className="clear"
          onClick={() => {
            field.clear();
          }}
        >
          {`Clear ${name}`}
        </Button>
      ) : null}
      {/* Mounted even when empty, so a message appearing is announced. */}
      <p id={feedbackId} className="feedback" role="status">
        {message}
      </p>
    </div>
  );
}
