import { Button } from "@canonical/react-ds-global";
import { TextInput } from "@canonical/react-ds-global-form";
import {
  type ReactElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { NameFormProps } from "./types.js";

const componentCssClassName = "ds data-views-saved-views-name-form";

/**
 * The name for a new view, or a view's new name.
 *
 * The name is required, natively: an empty one never reaches the store. A
 * name the collection refuses — blank once trimmed, or another view's — is
 * set as the input's own validity, so the browser reports it as it reports
 * any constraint, and cleared as the name is edited or submitted again —
 * the browser checks the input's validity before the form submits, so a
 * standing refusal is cleared as the submit begins and the collection is
 * asked anew. The form takes the focus when it opens, and takes it back
 * when a name is refused, so the error beside the input is where the user
 * already is. Escape cancels.
 */
export default function NameForm({
  label,
  submit,
  initial,
  pending,
  onSubmit,
  onCancel,
}: NameFormProps): ReactElement {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  useLayoutEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <form
      className={componentCssClassName}
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(name).then((refused) => {
          setError(refused);
          input.current?.setCustomValidity(refused ?? "");
          if (refused !== null) {
            // Reporting takes the focus in every engine that shows a
            // bubble; the focus call is for the ones that do not.
            input.current?.reportValidity();
            input.current?.focus();
          }
        });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      {/* The input's `id` lands on its wrapper, so no `for` can reach it. */}
      <span id={labelId} className="label">
        Name
      </span>
      <TextInput
        ref={input}
        value={name}
        required
        onChange={(event) => {
          setName(event.target.value);
          // A refusal is about the name as it was: editing it clears it.
          event.target.setCustomValidity("");
          setError(null);
        }}
        aria-labelledby={labelId}
        aria-describedby={error === null ? undefined : errorId}
      />
      {error === null ? null : (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        importance="primary"
        disabled={pending}
        onClick={() => {
          // The last refusal was about the last answer: ask again.
          input.current?.setCustomValidity("");
        }}
      >
        {submit}
      </Button>
      <Button type="button" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
