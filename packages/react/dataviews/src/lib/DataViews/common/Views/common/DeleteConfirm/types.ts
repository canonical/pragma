/**
 * Exempt from the native-prop extension convention: an internal renderer of
 * the views control, never rendered by a caller, whose root the control
 * places.
 */
export type DeleteConfirmProps = {
  /** The name of the view to delete. */
  readonly name: string;
  /** Whether an operation is in flight; deleting waits for it. */
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};
