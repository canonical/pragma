import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import createPatternFormatter from "../formatter/createPatternFormatter.js";
import type { Formatter } from "../formatter/types.js";
import useFormattedValue from "./useFormattedValue.js";

const US_PATTERN = "(###) ###-####";

/**
 * A controlled host, so the value really is re-driven from a model on every
 * keystroke — the condition under which the caret would otherwise jump. Uses
 * `type="text"`: the hook is type-agnostic, and jsdom's selection support is
 * best defined there.
 */
function Harness({
  formatter = createPatternFormatter(US_PATTERN),
  initial = "",
}: {
  formatter?: Formatter;
  initial?: string;
}) {
  const [model, setModel] = useState(initial);
  const formatted = useFormattedValue({
    formatter,
    model,
    onModelChange: setModel,
  });
  return (
    <>
      <input type="text" aria-label="field" {...formatted} />
      <output data-testid="model">{model}</output>
      {/* Stands in for an external write — an RHF reset, or a sibling setting
          this field — so a commit the hook did not cause can be exercised. */}
      <button type="button" onClick={() => setModel("9999999999")}>
        reset
      </button>
    </>
  );
}

const getField = () => screen.getByLabelText("field") as HTMLInputElement;

/**
 * Dispatch the edit the browser would: an `input` event carrying `inputType`,
 * which is the only thing distinguishing a backspace from a forward delete once
 * the value and caret have settled. React's onChange is driven by this event.
 */
function edit(
  input: HTMLInputElement,
  value: string,
  caret: number,
  inputType: string,
) {
  fireEvent.input(input, {
    target: { value, selectionStart: caret },
    inputType,
  });
}

/** Type `text` at `at`, as the browser would: splice it in, then fire the edit. */
function typeAt(input: HTMLInputElement, text: string, at: number) {
  const next = input.value.slice(0, at) + text + input.value.slice(at);
  edit(input, next, at + text.length, "insertText");
}

/** Backspace the character before `at`. */
function backspaceAt(input: HTMLInputElement, at: number) {
  const next = input.value.slice(0, at - 1) + input.value.slice(at);
  edit(input, next, at - 1, "deleteContentBackward");
}

/** Press Delete with the caret at `at`, removing the character ahead of it. */
function deleteForwardAt(input: HTMLInputElement, at: number) {
  const next = input.value.slice(0, at) + input.value.slice(at + 1);
  edit(input, next, at, "deleteContentForward");
}

/** Select the whole value and paste `text` over it, as one edit. */
function pasteOver(input: HTMLInputElement, text: string) {
  edit(input, text, text.length, "insertFromPaste");
}

describe("useFormattedValue", () => {
  it("renders the model through the formatter", () => {
    render(<Harness initial="5551234567" />);
    expect(getField()).toHaveValue("(555) 123-4567");
  });

  it("groups partial input as it is typed", () => {
    render(<Harness />);
    const input = getField();
    input.focus();
    typeAt(input, "5", 0);
    typeAt(input, "5", 1);
    typeAt(input, "5", 2);
    expect(input).toHaveValue("(555");
    expect(screen.getByTestId("model")).toHaveTextContent("555");
  });

  it("keeps the caret with the typed character on a mid-string insert", () => {
    render(<Harness initial="5551234567" />);
    const input = getField();
    input.focus();

    // Caret sits after "(555"; type a 9 there.
    typeAt(input, "9", 4);

    // The 9 became the 4th digit and every separator after it shifted.
    expect(input).toHaveValue("(555) 912-34567");
    // Caret is immediately after the 9 — not dumped at the end.
    expect(input.selectionStart).toBe(7);
  });

  it("puts the caret at the end when appending", () => {
    render(<Harness initial="555" />);
    const input = getField();
    input.focus();
    typeAt(input, "1", 4);
    expect(input).toHaveValue("(555) 1");
    expect(input.selectionStart).toBe(7);
  });

  it("removes the preceding digit when a separator is backspaced", () => {
    render(<Harness initial="5551234567" />);
    const input = getField();
    input.focus();

    // "(555) 123-4567" — backspace the space at index 5.
    backspaceAt(input, 6);

    // Deleting decoration alone would be a no-op, so the digit before it goes.
    expect(screen.getByTestId("model")).toHaveTextContent("551234567");
    expect(input).toHaveValue("(551) 234-567");
    expect(input.selectionStart).toBe(3);
  });

  it("keeps every digit when a paste replaces the value with an equivalent", () => {
    render(<Harness initial="5551234567" />);
    const input = getField();
    input.focus();

    // Pasting the same digits over the formatted value produces the same model
    // from a shorter string. Reading that as a deleted separator would quietly
    // drop the last digit — the shape browser autofill also arrives in.
    pasteOver(input, "5551234567");

    expect(screen.getByTestId("model")).toHaveTextContent("5551234567");
    expect(input).toHaveValue("(555) 123-4567");
  });

  it("takes the digit ahead of the caret on a forward delete", () => {
    render(<Harness initial="5551234567" />);
    const input = getField();
    input.focus();

    // "(555) 123-4567": Delete with the caret in front of the hyphen. The value
    // and caret afterwards are identical to a backspace one place to the right,
    // so only the event tells them apart — read as a backspace, this eats the 3.
    deleteForwardAt(input, 9);

    expect(screen.getByTestId("model")).toHaveTextContent("555123567");
    expect(input.selectionStart).toBe(9);
  });

  it("leaves the caret alone when the model is replaced from outside", () => {
    render(<Harness initial="555" />);
    const input = getField();
    input.focus();
    input.setSelectionRange(2, 2);
    const setSelectionRange = vi.spyOn(input, "setSelectionRange");

    // A commit this hook did not cause — a form-level reset, say.
    fireEvent.click(screen.getByText("reset"));

    expect(input).toHaveValue("(999) 999-9999");
    expect(setSelectionRange).not.toHaveBeenCalled();
  });

  it("rejects a character the formatter cannot represent", () => {
    render(<Harness initial="5551234567" />);
    const input = getField();
    input.focus();

    typeAt(input, "a", 4);

    // The letter is gone from the DOM, not left sitting there, and the caret
    // has not run to the end.
    expect(input).toHaveValue("(555) 123-4567");
    expect(input.selectionStart).toBe(4);
    expect(screen.getByTestId("model")).toHaveTextContent("5551234567");
  });

  it("does not touch the caret when the input is not focused", () => {
    render(<Harness initial="555" />);
    const input = getField();
    // Asserting on a spy rather than on selectionStart: an unfocused element's
    // caret is jsdom's business once React rewrites the value. What matters is
    // that the hook itself keeps its hands off, so a form-level `reset()` never
    // yanks a cursor that is somewhere else entirely.
    const setSelectionRange = vi.spyOn(input, "setSelectionRange");

    typeAt(input, "1", 4);

    expect(input).toHaveValue("(555) 1");
    expect(setSelectionRange).not.toHaveBeenCalled();
  });

  it("renders composed text verbatim until the composition ends", () => {
    render(<Harness initial="555" />);
    const input = getField();
    input.focus();

    fireEvent.compositionStart(input);
    typeAt(input, "1", 4);
    // Ungrouped and uncommitted — reformatting here, or declining to render at
    // all, would let React rewrite the element out from under the IME.
    expect(input).toHaveValue("(5551");
    expect(screen.getByTestId("model")).toHaveTextContent("555");

    fireEvent.compositionEnd(input);
    expect(screen.getByTestId("model")).toHaveTextContent("5551");
    expect(input).toHaveValue("(555) 1");
  });

  it("normalises without decorating when the formatter has no pattern", () => {
    render(
      <Harness formatter={createPatternFormatter()} initial="5551234567" />,
    );
    expect(getField()).toHaveValue("5551234567");
  });
});
