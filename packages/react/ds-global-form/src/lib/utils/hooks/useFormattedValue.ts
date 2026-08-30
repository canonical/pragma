import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Formatter } from "../formatter/types.js";
import type {
  UseFormattedValueProps,
  UseFormattedValueResult,
} from "./types.js";

/** What the user did to the value, as far as the caret is concerned. */
type EditIntent = "insert" | "deleteBackward" | "deleteForward";

/** The model an edit produces, and where the caret sits within that model. */
type ResolvedEdit = {
  /** The model the edit implies. */
  model: string;
  /** How many model characters precede the caret. */
  offset: number;
};

/** A caret to restore, and the exact view it was computed against. */
type PendingCaret = {
  offset: number;
  view: string;
};

// `useLayoutEffect` has no meaning on the server and React warns when it is
// called there. The caret work is inherently client-only, so fall back to
// `useEffect`, which never runs during `renderToString`.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Drop the model character at `index`.
 *
 * @note Pure.
 */
function removeModelCharAt(model: string, index: number): string {
  return model.slice(0, index) + model.slice(index + 1);
}

/**
 * Classify an edit as an insertion or a deletion, and which way the deletion
 * ran. Backspace and forward Delete over a separator produce an identical value
 * and caret, so the event is the only thing that tells them apart.
 *
 * Falls back to backspace when `inputType` is absent — synthetic events dispatch
 * a plain `Event`, and backspace is the only deletion worth assuming.
 *
 * @note Pure.
 */
function readEditIntent(
  event: React.ChangeEvent<HTMLInputElement>,
): EditIntent {
  const { inputType } = event.nativeEvent as Partial<InputEvent>;
  if (inputType === undefined) return "deleteBackward";
  if (inputType.includes("Forward")) return "deleteForward";
  if (inputType.startsWith("delete")) return "deleteBackward";
  return "insert";
}

/**
 * Find the offset in `view` with exactly `offset` model characters before it —
 * where the caret belongs once the value has been reformatted.
 *
 * Display offsets cannot be carried across a reformat directly, because
 * inserting one digit can move every separator after it. Counting model
 * characters is stable under that: the user's caret is "after the 4th digit"
 * whatever decoration surrounds it.
 *
 * @note Pure.
 */
function findCaretOffset(
  formatter: Formatter,
  view: string,
  offset: number,
): number {
  let position = 0;
  while (
    position < view.length &&
    formatter.parse(view.slice(0, position)).length < offset
  ) {
    position += 1;
  }
  return position;
}

/**
 * Work out which model an edit produces, and where the caret ends up in it.
 *
 * Deleting a separator is the case worth naming: it leaves the model untouched,
 * so a reformat would put the character straight back and the keystroke would
 * appear to do nothing. A model character is removed instead — the one behind
 * the caret for a backspace, the one ahead of it for a forward delete.
 *
 * That substitution applies only when a deletion removed exactly one display
 * character. A wider edit — a paste, or a range replaced with equivalent text —
 * can legitimately produce the same model from a shorter string, and must not be
 * read as "take a digit instead".
 *
 * @note Pure.
 */
function resolveEdit(
  formatter: Formatter,
  model: string,
  view: string,
  caret: number,
  intent: EditIntent,
): ResolvedEdit {
  const offset = formatter.parse(view.slice(0, caret)).length;
  const parsed = formatter.parse(view);

  const removedOneCharacter =
    view.length === formatter.format(model).length - 1;
  if (parsed !== model || intent === "insert" || !removedOneCharacter) {
    return { model: parsed, offset };
  }

  if (intent === "deleteForward") {
    // The caret does not move: the character it was sitting in front of goes.
    return offset < model.length
      ? { model: removeModelCharAt(model, offset), offset }
      : { model, offset };
  }
  return offset > 0
    ? { model: removeModelCharAt(model, offset - 1), offset: offset - 1 }
    : { model, offset };
}

/**
 * Put the formatted value back on an element after an edit that changed nothing.
 *
 * Typing a character the formatter discards leaves the model equal, so React
 * re-renders nothing and the rejected text would otherwise sit in the DOM.
 *
 * @note Impure — writes the element's value and selection directly, because
 * there is no render to hang the correction on.
 */
function restoreRejectedEdit(
  node: HTMLInputElement,
  formatter: Formatter,
  model: string,
  offset: number,
): void {
  const view = formatter.format(model);
  node.value = view;
  const position = findCaretOffset(formatter, view, offset);
  node.setSelectionRange(position, position);
}

/**
 * Drive a text input whose displayed string is a formatted projection of the
 * value it stores, without the caret jumping to the end on every keystroke.
 *
 * The naive spelling of this — `value={format(model)}` with an `onChange` that
 * parses back — reformats the whole string on each edit, so React rewrites
 * `input.value` and the browser drops the caret at the end. Editing anywhere but
 * the end becomes impossible. This hook does the same projection but restores
 * the caret afterwards, by position in the model rather than in the display.
 *
 * Composed text is rendered verbatim until `compositionend`, so an IME is never
 * rewritten mid-composition.
 *
 * The value is owned by the caller: this hook never holds it in state, so it
 * composes with react-hook-form, a `useState` above it, or any other source.
 *
 * The `formatter` must satisfy the contract on {@link Formatter} — in
 * particular `parse(format(m)) === m`. A `parse` that truncates or is not a left
 * inverse will strand the caret at the end and can make a deletion remove the
 * wrong character.
 *
 * Only for inputs that support text selection. `setSelectionRange` throws on
 * `type="number"` and `type="email"`.
 *
 * @note Impure — moves the caret on the element behind `ref`, which is the whole
 * point of the hook and cannot be expressed as a return value.
 */
export default function useFormattedValue({
  formatter,
  model,
  onModelChange,
}: UseFormattedValueProps): UseFormattedValueResult {
  const ref = useRef<HTMLInputElement | null>(null);
  // The caret to restore once the reformatted value has been committed, stamped
  // with the view it belongs to so an unrelated commit cannot consume it.
  const pending = useRef<PendingCaret | null>(null);
  const composing = useRef(false);
  // The raw text an IME is composing, rendered verbatim so the element is not
  // rewritten mid-composition. Null whenever no composition is in progress.
  const [composingView, setComposingView] = useState<string | null>(null);

  const commit = (next: string, offset: number) => {
    pending.current = { offset, view: formatter.format(next) };
    onModelChange(next);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const node = event.target;

    // Mid-composition the text is provisional. Render it back exactly as typed:
    // formatting it, or simply declining to emit, both let React restore the
    // previous value underneath the IME and destroy the composition.
    if (composing.current) {
      setComposingView(node.value);
      return;
    }

    const caret = node.selectionStart ?? node.value.length;
    const edit = resolveEdit(
      formatter,
      model,
      node.value,
      caret,
      readEditIntent(event),
    );

    if (edit.model === model) {
      restoreRejectedEdit(node, formatter, model, edit.offset);
      return;
    }

    commit(edit.model, edit.offset);
  };

  const handleCompositionStart = () => {
    composing.current = true;
  };

  const handleCompositionEnd = (
    event: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composing.current = false;
    const node = event.currentTarget;
    const composed = node.value;
    const caret = node.selectionStart ?? composed.length;
    setComposingView(null);

    const parsed = formatter.parse(composed);
    if (parsed === model) return;
    commit(parsed, formatter.parse(composed.slice(0, caret)).length);
  };

  // Runs after every commit, but acts only on the one this hook's own edit
  // produced — matching the committed view against the caret's stamp. A render
  // the user did not cause (an external `reset()`, say) never moves their cursor.
  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    const target = pending.current;
    if (node === null || target === null) return;
    if (node.value !== target.view) return;
    pending.current = null;
    if (document.activeElement !== node) return;

    const position = findCaretOffset(formatter, node.value, target.offset);
    node.setSelectionRange(position, position);
  });

  return {
    value: composingView ?? formatter.format(model),
    onChange: handleChange,
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    ref,
  };
}
