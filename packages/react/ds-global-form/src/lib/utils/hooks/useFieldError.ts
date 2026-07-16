import {
  type FieldError,
  type FieldErrorsImpl,
  type FieldValues,
  get,
  useFormState,
} from "react-hook-form";

/**
 * Field-scoped subscription to a single field's error.
 *
 * Subscribes via `useFormState({ name })` so only this field's slice of form
 * state triggers a re-render, then resolves the error at `name` from the
 * (possibly nested) `errors` tree on every render with RHF's own `get`.
 *
 * Resolving on render — rather than memoising against a fixed, hand-unrolled
 * list of parent references — is what lets a *message-only* change surface: on
 * cross-field revalidation a field can stay errored while its message text
 * changes (e.g. a min-age constraint tightens), and `get` reflects the new
 * message at any nesting depth. `useFormState`'s field-scoped subscription
 * still gates the re-render, so efficiency is preserved.
 */
function useFieldError<TFieldValues extends FieldValues = FieldValues>(
  name: string,
): FieldError | undefined {
  const { errors } = useFormState({ name }) as FieldErrorsImpl<TFieldValues>;

  return get(errors, name) as FieldError | undefined;
}

export default useFieldError;
