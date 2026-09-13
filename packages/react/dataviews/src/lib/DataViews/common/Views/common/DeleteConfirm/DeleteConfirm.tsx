import { Button } from "@canonical/react-ds-global";
import { type ReactElement, useId, useLayoutEffect, useRef } from "react";
import type { DeleteConfirmProps } from "./types.js";

const componentCssClassName = "ds data-views-views-confirm";

/**
 * The question deleting a view asks first, naming the view. The focus starts
 * on Cancel, so a stray Enter deletes nothing. Escape cancels.
 */
export default function DeleteConfirm({
  name,
  pending,
  onConfirm,
  onCancel,
}: DeleteConfirmProps): ReactElement {
  const cancel = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  useLayoutEffect(() => {
    cancel.current?.focus();
  }, []);
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
        {`Delete "${name}"? This cannot be undone.`}
      </p>
      <Button
        type="button"
        anticipation="destructive"
        disabled={pending}
        onClick={onConfirm}
      >
        Delete view
      </Button>
      <Button ref={cancel} type="button" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
