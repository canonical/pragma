/**
 * Pure classification of a `select` prompt's choices, so the Ink
 * `SelectQuestion` widget can guard the two degenerate shapes that would
 * otherwise HANG the wizard (C4/M6): a select with ZERO choices (nothing to
 * pick — only Ctrl-C/Escape exit, a silent dead-end), and a select with EXACTLY
 * one choice (a forced pick that should resolve itself rather than demand a
 * keystroke).
 *
 * Lives as a `.ts` sibling of the JSX widgets so the branch logic is unit
 * testable WITHOUT standing up an Ink render (the `.tsx` widget file is excluded
 * from the vitest unit run).
 */

/** One selectable option, as carried by a `select`/`multiselect` question. */
export interface SelectChoice {
  readonly label: string;
  readonly value: string;
}

/**
 * The shape a select's choices reduce to:
 *
 * - `empty` — zero choices: a misconfiguration the widget surfaces as a clear
 *   error instead of a silent hang.
 * - `single` — exactly one choice: auto-resolve it (no keystroke needed).
 * - `multiple` — the normal interactive list.
 */
export type SelectChoicesClassification =
  | { readonly kind: "empty" }
  | { readonly kind: "single"; readonly value: string }
  | { readonly kind: "multiple"; readonly choices: readonly SelectChoice[] };

/**
 * Classify a select's choices into a {@link SelectChoicesClassification}.
 *
 * @param choices - The select prompt's declared or dynamically-built choices.
 * @returns The degenerate-or-normal classification the widget branches on.
 */
export function classifySelectChoices(
  choices: readonly SelectChoice[],
): SelectChoicesClassification {
  if (choices.length === 0) return { kind: "empty" };
  const only = choices.at(0);
  if (choices.length === 1 && only !== undefined) {
    return { kind: "single", value: only.value };
  }
  return { kind: "multiple", choices };
}
