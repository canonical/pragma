import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId, useRef } from "react";
import { useFilterHandle } from "../../../../hooks/index.js";
import { describeFilterFeedback } from "../utils/index.js";
import type { TextFilterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-filters-text";

/** What each text operator adds to the field's name. */
const OPERATOR_WORDING = {
  contains: "contains",
  startsWith: "starts with",
} as const;

/**
 * One text filter: the text a text field must contain, or start with.
 *
 * A labelled native text input named as the wire spells the clause,
 * `<field>__contains` or `<field>__startsWith`, so a GET submission before
 * any script runs is the
 * same destination the edit writes; the server's decoder reads it back as
 * the predicate. Once scripting is enabled each edit applies as it is typed.
 * Emptying the input is incomplete, not a removal: the applied text stays
 * until it is cleared, which is what the clear control is for; at baseline
 * an emptied input submits no clause. Clearing moves focus to the input while
 * the source declares the text, and otherwise to the filters' group, as the
 * control leaves with it. What the source refused, and why, is said beside
 * the input.
 */
export default function TextFilter({
  handle,
  operator,
  label,
  field: fieldName,
  declared,
  onLeave,
}: TextFilterProps): ReactElement | null {
  const field = useFilterHandle(handle);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const retained = field.applied.kind === "value";
  if (!declared && !retained) {
    return null;
  }
  const feedbackId = `${inputId}-feedback`;
  const message = describeFilterFeedback(field.feedback, retained);
  const name = `${label} ${OPERATOR_WORDING[operator]}`;
  return (
    <div className={componentCssClassName}>
      <label htmlFor={inputId} className="label">
        {name}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="input"
        type="text"
        name={spellWireKey(fieldName, operator)}
        value={field.input}
        // Undeclared, the text can only be cleared, never replaced.
        readOnly={!declared}
        aria-invalid={
          field.feedback.status === "invalid" ||
          field.feedback.status === "refused"
        }
        aria-describedby={message === null ? undefined : feedbackId}
        onChange={(event) => {
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
            // The control with focus leaves with the text. The input stays
            // while the source declares the field, so focus goes there;
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
      {/* Mounted even when empty, so a message appearing is announced. */}
      <p id={feedbackId} className="feedback" role="status">
        {message}
      </p>
    </div>
  );
}
