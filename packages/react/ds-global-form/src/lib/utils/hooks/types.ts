import type React from "react";
import type { Formatter } from "../formatter/types.js";

/**
 * Prop and result types for the hooks in this folder.
 *
 * They live together rather than beside each hook so a hook's contract can be
 * read without opening its implementation, and so a consumer typing a wrapper
 * around one has a single import to reach for.
 */

export type UseFormattedValueProps = {
  /**
   * The model/view pair driving the input. `format` renders the model for
   * display, `parse` recovers the model from what the user typed.
   */
  formatter: Formatter;

  /** The stored value — raw digits, for a phone number. */
  model: string;

  /** Called with the next model whenever the user edits the input. */
  onModelChange: (next: string) => void;
};

export type UseFormattedValueResult = {
  /** The formatted string to render as the input's `value`. */
  value: string;

  /** Change handler that keeps the model, the display, and the caret in step. */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  /** Suspends reformatting while an IME composition is in progress. */
  onCompositionStart: () => void;

  /** Resumes reformatting and commits the composed text. */
  onCompositionEnd: (event: React.CompositionEvent<HTMLInputElement>) => void;

  /** Must reach the input element — the caret cannot be placed without it. */
  ref: React.RefObject<HTMLInputElement | null>;
};
