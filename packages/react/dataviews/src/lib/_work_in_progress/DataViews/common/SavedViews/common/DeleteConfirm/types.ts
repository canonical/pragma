/**
 * Exempt from the native-prop extension convention: an internal renderer of
 * the saved-views control, never rendered by a caller, whose root the control
 * places.
 */
export type DeleteConfirmProps = {
  /** The question deleting asks first, naming the view. */
  readonly question: string;
  /** The submitting button's text. */
  readonly submit: string;
  /** The cancel button's text. */
  readonly cancel: string;
  /** Whether a command is in flight; deleting waits for it. */
  readonly pending: boolean;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
};
