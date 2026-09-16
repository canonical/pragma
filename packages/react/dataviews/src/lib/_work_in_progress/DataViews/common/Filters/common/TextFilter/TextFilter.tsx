import type { DataViewsMessages } from "@canonical/dataviews-core";
import { spellWireKey } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId, useRef } from "react";
import { useDataViewsRoot, useFilterHandle } from "../../../../hooks/index.js";
import { describeFilterFeedback } from "../utils/index.js";
import type { TextFilterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-filters-text";

/** The message naming each text operator's input, by the field's label. */
const OPERATOR_MESSAGES = {
  contains: "filterContains",
  startsWith: "filterStartsWith",
} as const satisfies Readonly<
  Record<TextFilterProps["operator"], keyof DataViewsMessages>
>;

/**
 * One text filter: the text a text field must contain, or start with.
 *
 * A labelled native text input named as the wire spells the clause,
 * `<field>__contains` or `<field>__startsWith`, so a GET submission before
 * any script runs is the same destination the edit writes; the server's
 * decoder reads it back as the predicate. Once scripting is enabled each
 * edit applies as it is typed. Emptying the input is incomplete, not a
 * removal: the applied text stays until it is cleared, which is what the
 * clear control is for; at baseline an emptied input submits no clause.
 * Clearing moves focus to the input while the control stays, and to the
 * filters' group when it leaves with the text — undeclared, or shown only
 * because it is restricted. What the source refused, and why, is said beside
 * the input.
 */
export default function TextFilter({
  handle,
  operator,
  label,
  field: fieldName,
  declared,
  leavesWhenCleared,
  onLeave,
}: TextFilterProps): ReactElement | null {
  const { messages } = useDataViewsRoot("Filters");
  const field = useFilterHandle(handle);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const retained = field.applied.kind === "value";
  if (!declared && !retained) {
    return null;
  }
  const feedbackId = `${inputId}-feedback`;
  const message = describeFilterFeedback(field.feedback, retained, messages);
  const name = messages[OPERATOR_MESSAGES[operator]](label);
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
      {/* Mounted even when empty, so a message appearing is announced. */}
      <p id={feedbackId} className="feedback" role="status">
        {message}
      </p>
    </div>
  );
}
