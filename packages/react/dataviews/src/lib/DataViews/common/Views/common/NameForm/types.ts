/**
 * Exempt from the native-prop extension convention: an internal renderer of
 * the views control, never rendered by a caller, whose root the control
 * places.
 */
export type NameFormProps = {
  /** The form's accessible name: what the name is for. */
  readonly label: string;
  /** The submit button's text. */
  readonly submit: string;
  /** The name the input starts with. */
  readonly initial: string;
  /** Whether an operation is in flight; the form cannot submit meanwhile. */
  readonly pending: boolean;
  /**
   * Submit a name. Resolves with why it was refused, as a sentence, or null
   * once it is taken.
   */
  readonly onSubmit: (name: string) => Promise<string | null>;
  readonly onCancel: () => void;
};
