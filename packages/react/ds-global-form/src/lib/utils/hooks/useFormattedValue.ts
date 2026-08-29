import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Formatter } from "../formatter/types.js";
import type {
  UseFormattedValueProps,
  UseFormattedValueResult,
} from "./types.js";

/** The model an edit produces, and where the caret sits within that model. */
type ResolvedEdit = {
  /** The model the edit implies. */
  model: string;
  /** How many model characters precede the caret. */
  offset: number;
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
 * appear to do nothing. The model character before the caret is removed instead.
 *
 * @note Pure.
 */
function resolveEdit(
  formatter: Formatter,
  model: string,
  view: string,
  caret: number,
): ResolvedEdit {
  const offset = formatter.parse(view.slice(0, caret)).length;
  const parsed = formatter.parse(view);

  const deletedSeparator =
    parsed === model &&
    view.length < formatter.format(model).length &&
    offset > 0;

  return deletedSeparator
    ? { model: removeModelCharAt(model, offset - 1), offset: offset - 1 }
    : { model: parsed, offset };
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
 * @note Impure — moves the caret on the element behind `ref`, which is the whole
 * point of the hook and cannot be expressed as a return value.
 */
export default function useFormattedValue({
  formatter,
  model,
  onModelChange,
}: UseFormattedValueProps): UseFormattedValueResult {
  const ref = useRef<HTMLInputElement | null>(null);
  // Model characters before the caret, awaiting translation back into a display
  // offset once the reformatted value has been committed.
  const pendingOffset = useRef<number | null>(null);
  const composing = useRef(false);
  // The raw text an IME is composing, rendered verbatim so the element is not
  // rewritten mid-composition. Null whenever no composition is in progress.
  const [composingView, setComposingView] = useState<string | null>(null);

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
    const edit = resolveEdit(formatter, model, node.value, caret);

    if (edit.model === model) {
      restoreRejectedEdit(node, formatter, model, edit.offset);
      return;
    }

    pendingOffset.current = edit.offset;
    onModelChange(edit.model);
  };

  const handleCompositionStart = () => {
    composing.current = true;
  };

  const handleCompositionEnd = (
    event: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composing.current = false;
    const composed = event.currentTarget.value;
    setComposingView(null);
    const parsed = formatter.parse(composed);
    if (parsed !== model) onModelChange(parsed);
  };

  // Runs after every commit; the pending offset gates the work, so a render the
  // user did not cause (an external `reset()`, say) never moves their cursor.
  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    const offset = pendingOffset.current;
    pendingOffset.current = null;
    if (node === null || offset === null) return;
    if (document.activeElement !== node) return;

    const position = findCaretOffset(formatter, node.value, offset);
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
