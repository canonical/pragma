import type { FieldFeedback } from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { useId } from "react";
import useDataViewsField from "../../../../hooks/useDataViewsField.js";
import sentenceOf from "../../../../sentenceOf.js";
import type { BoundFilterProps } from "./types.js";

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
  feedback: FieldFeedback,
  retained: boolean,
): string | null => {
  switch (feedback.kind) {
    case "none":
    case "applied":
      return null;
    case "incomplete":
      return retained
        ? `Enter a value to change this restriction. ${STILL_APPLIES}`
        : "Enter a value to apply this restriction.";
    case "invalid":
      return feedback.retainsPredicate
        ? `${sentenceOf(feedback.reason)} ${STILL_APPLIES}`
        : sentenceOf(feedback.reason);
  }
};

/**
 * One bound of a number or date field.
 *
 * Emptying the input is incomplete, not a removal: the applied bound stays
 * until it is explicitly cleared, which is what the clear control is for.
 * A number is typed as text, so what the user typed is what is validated
 * and shown — a number input would hand over an empty value instead.
 */
export default function BoundFilter({
  handle,
  label,
  bound,
  kind,
  declared,
}: BoundFilterProps): ReactElement | null {
  const field = useDataViewsField(handle);
  const inputId = useId();
  const retained = field.applied.kind === "value";
  if (!declared && !retained) {
    return null;
  }
  const feedbackId = `${inputId}-feedback`;
  const message = feedbackTextOf(field.feedback, retained);
  const name = `${label} ${BOUND_WORDING[bound]}`;
  return (
    <div className={componentCssClassName}>
      <label htmlFor={inputId} className="label">
        {name}
      </label>
      <input
        id={inputId}
        className="input"
        type={kind === "number" ? "text" : "date"}
        inputMode={kind === "number" ? "decimal" : undefined}
        value={field.input}
        // Undeclared, the bound can only be cleared, never replaced.
        readOnly={!declared}
        aria-invalid={field.feedback.kind === "invalid"}
        aria-describedby={message === null ? undefined : feedbackId}
        onChange={(event) => {
          field.edit(event.target.value);
        }}
      />
      {retained ? (
        <button
          type="button"
          className="clear"
          onClick={() => {
            field.clear();
          }}
        >
          {`Clear ${name}`}
        </button>
      ) : null}
      {/* Mounted even when empty, so a message appearing is announced. */}
      <p id={feedbackId} className="feedback" role="status">
        {message}
      </p>
    </div>
  );
}
