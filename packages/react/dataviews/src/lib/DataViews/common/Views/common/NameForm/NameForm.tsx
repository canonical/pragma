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

const componentCssClassName = "ds data-views-views-name-form";

/**
 * The name for a new view, or a view's new name.
 *
 * It takes the focus when it opens, and takes it back when a name is
 * refused, so the error beside the input is where the user already is.
 * Escape cancels.
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
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(name).then((refused) => {
          setError(refused);
          if (refused !== null) {
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
        onChange={(event) => {
          setName(event.target.value);
        }}
        aria-labelledby={labelId}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
      />
      {error === null ? null : (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
      <Button type="submit" importance="primary" disabled={pending}>
        {submit}
      </Button>
      <Button type="button" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
