import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId } from "react";
import type { DeleteConfirmProps } from "./types.js";

const componentCssClassName = "ds data-views-saved-views-confirm";

/**
 * The question deleting a view asks first, naming the view. The focus starts
 * on Cancel, so a stray Enter deletes nothing. Escape cancels.
 */
export default function DeleteConfirm({
  question,
  submit,
  cancel,
  pending,
  onSubmit,
  onCancel,
}: DeleteConfirmProps): ReactElement {
  const messageId = useId();
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form controls under a legend; this groups a question with its answers
    <div
      role="group"
      aria-labelledby={messageId}
      className={componentCssClassName}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <p id={messageId} className="message">
        {question}
      </p>
      <Button
        type="button"
        anticipation="destructive"
        disabled={pending}
        onClick={onSubmit}
      >
        {submit}
      </Button>
      {/* The safe answer takes focus, so Enter cancels and Escape is not the only way out. */}
      <Button autoFocus type="button" onClick={onCancel}>
        {cancel}
      </Button>
    </div>
  );
}
