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
    </>
  );
}

const getField = () => screen.getByLabelText("field") as HTMLInputElement;

/** Type `text` at `at`, as the browser would: splice it in, then fire change. */
function typeAt(input: HTMLInputElement, text: string, at: number) {
  const next = input.value.slice(0, at) + text + input.value.slice(at);
  fireEvent.change(input, {
    target: { value: next, selectionStart: at + text.length },
  });
}

/** Backspace the character before `at`. */
function backspaceAt(input: HTMLInputElement, at: number) {
  const next = input.value.slice(0, at - 1) + input.value.slice(at);
  fireEvent.change(input, {
    target: { value: next, selectionStart: at - 1 },
  });
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
