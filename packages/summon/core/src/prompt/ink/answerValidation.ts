/**
 * Pure evaluation of a prompt's `validate` for the Ink widgets, so
 * select/multiselect/confirm can run it INLINE with recovery (C6/M5) exactly as
 * the text widget already does — instead of only catching a bad answer
 * post-collection in `validateAnswers`, which fails the whole run with no chance
 * to correct it in place. This is also the mechanism a multiselect uses to
 * enforce a minimum selection (C-lo3): a validator that rejects an empty array.
 *
 * A `.ts` sibling of the JSX widgets so the accept/reject decision is unit
 * testable without an Ink render.
 */

/** A prompt's own value constraint: `true` accepts, a string is the error text. */
export type ValidateFn = (value: unknown) => boolean | string;

/** The outcome of running a {@link ValidateFn}: accepted, or a message to show. */
export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/** The fallback message when a validator rejects without its own string. */
export const DEFAULT_INVALID_MESSAGE = "Invalid input";

/**
 * Run a prompt's optional `validate` against a candidate answer.
 *
 * @param validate - The prompt's validator, or `undefined` (always accepts).
 * @param value - The candidate answer to check.
 * @returns A {@link ValidationResult} — `ok` when accepted, else the message.
 */
export function evaluateValidation(
  validate: ValidateFn | undefined,
  value: unknown,
): ValidationResult {
  if (!validate) return { ok: true };
  const verdict = validate(value);
  if (verdict === true) return { ok: true };
  return {
    ok: false,
    message: typeof verdict === "string" ? verdict : DEFAULT_INVALID_MESSAGE,
  };
}
