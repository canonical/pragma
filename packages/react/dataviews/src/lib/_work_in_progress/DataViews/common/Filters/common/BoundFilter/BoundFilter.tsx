import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId, useRef } from "react";
import { useFilterHandle } from "../../../../hooks/index.js";
import { describeFilterFeedback } from "../utils/index.js";
import type { BoundFilterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-filters-bound";

const BOUND_WORDING = { gte: "from", lte: "to" } as const;

/** What the hint beside each bound calls the value the facet offers for it. */
const RANGE_WORDING = { gte: "Lowest", lte: "Highest" } as const;

/**
 * One bound of a number or date field.
 *
 * Emptying the input is incomplete, not a removal: the applied bound stays
 * until it is explicitly cleared, which is what the clear control is for;
 * clearing moves focus to the input while the source declares the bound,
 * and otherwise to the filters' group, as the control leaves with it. A
 * number is a native number input carrying the schema's bounds, so the
 * browser validates it before any script runs and the same bounds the schema
 * enforces are the ones it announces; a date is a native date input.
 * The control is named as the wire spells the clause, so a GET submission
 * is the same destination the edit writes. Where the source's facet answers
 * the applied query, a hint beside the input offers the least value a
 * matching record holds for the lower bound, and the greatest for the upper,
 * computed over the whole matching set with this field's bounds lifted.
 */
export default function BoundFilter({
  handle,
  label,
  bound,
  definition,
  range,
  declared,
  onLeave,
}: BoundFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const retained = field.applied.kind === "value";
  if (!declared && !retained) {
    return null;
  }
  const feedbackId = `${inputId}-feedback`;
  const hintId = `${inputId}-hint`;
  const message = describeFilterFeedback(field.feedback, retained);
  const offered =
    range === null ? null : range[bound === "gte" ? "min" : "max"];
  const hint =
    offered === null || offered === undefined
      ? null
      : `${RANGE_WORDING[bound]}: ${offered}`;
  const describedBy = [
    ...(hint === null ? [] : [hintId]),
    ...(message === null ? [] : [feedbackId]),
  ].join(" ");
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
        ref={inputRef}
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
        aria-describedby={describedBy === "" ? undefined : describedBy}
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
            // The control with focus leaves with the bound. The input stays
            // while the source declares the bound, so focus goes there;
            // otherwise the whole control leaves, and its parent places
            // focus rather than the document.
            if (declared) {
              inputRef.current?.focus();
            } else {
              onLeave();
            }
          }}
        >
          {`Clear ${name}`}
        </Button>
      ) : null}
      {hint === null ? null : (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {/* Mounted even when empty, so a message appearing is announced. */}
      <p id={feedbackId} className="feedback" role="status">
        {message}
      </p>
    </div>
  );
}
