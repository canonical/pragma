import type { DataViewsMessages } from "@canonical/dataviews-core";
import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId, useRef } from "react";
import { useDataViewsRoot, useFilterHandle } from "../../../../hooks/index.js";
import { describeFilterFeedback } from "../utils/index.js";
import type { BoundFilterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-filters-bound";

/** The message naming each bound, by the field's label. */
const BOUND_MESSAGES = {
  gte: "filterFrom",
  lte: "filterTo",
} as const satisfies Readonly<
  Record<BoundFilterProps["bound"], keyof DataViewsMessages>
>;

/** The message offering the value a facet holds for each bound, beside it. */
const RANGE_MESSAGES = {
  gte: "filterLowest",
  lte: "filterHighest",
} as const satisfies Readonly<
  Record<BoundFilterProps["bound"], keyof DataViewsMessages>
>;

/**
 * One bound of a number or date field.
 *
 * Emptying the input is incomplete, not a removal: the applied bound stays
 * until it is explicitly cleared, which is what the clear control is for;
 * clearing moves focus to the input while the control stays, and to the
 * filters' group when it leaves with the bound — undeclared, or shown only
 * because it is restricted. A number is a native number input carrying the
 * schema's bounds, so the browser validates it before any script runs and the
 * same bounds the schema enforces are the ones it announces; a date is a
 * native date input. The control is named as the wire spells the clause, so a
 * GET submission is the same destination the edit writes. Where the source's
 * facet answers the applied query, a hint beside the input offers the least
 * value a matching record holds for the lower bound ("Lowest") and the
 * greatest for the upper ("Highest"), from the range computed over the whole
 * matching set with this field's bounds lifted.
 */
export default function BoundFilter({
  handle,
  label,
  bound,
  definition,
  offered,
  declared,
  leavesWhenCleared,
  onLeave,
}: BoundFilterProps): ReactElement | null {
  const { messages } = useDataViewsRoot("Filters");
  const field = useFilterHandle(handle);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const retained = field.applied.kind === "value";
  if (!declared && !retained) {
    return null;
  }
  const feedbackId = `${inputId}-feedback`;
  const hintId = `${inputId}-hint`;
  const message = describeFilterFeedback(field.feedback, retained, messages);
  const hint =
    offered === null ? null : messages[RANGE_MESSAGES[bound]](String(offered));
  const describedBy =
    [hint === null ? null : hintId, message === null ? null : feedbackId]
      .filter((id) => id !== null)
      .join(" ") || undefined;
  const name = messages[BOUND_MESSAGES[bound]](label);
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
        aria-describedby={describedBy}
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
            // unless the control leaves with its last restriction —
            // undeclared, or shown only because it is restricted — so focus
            // goes there; otherwise its parent places focus rather than the
            // document.
            if (!leavesWhenCleared) {
              inputRef.current?.focus();
            } else {
              onLeave();
            }
          }}
        >
          {messages.clearFilter(name)}
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
