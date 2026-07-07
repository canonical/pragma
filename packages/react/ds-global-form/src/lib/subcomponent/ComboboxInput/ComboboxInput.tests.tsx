import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { ComboboxField } from "#lib/component/ComboboxField/index.js";
import type { Option } from "../types.js";
import { ComboboxInput } from "./ComboboxInput.js";

const fruits: Option[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

/**
 * The visible selection is the set of chips (`button.chip` inside
 * `.selected-items`). Query them directly rather than by text — the dropdown
 * list also renders each option as `<li role="option">`, so a plain text query
 * would conflate a selected chip with an available option.
 */
const chipLabels = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll(".selected-items .chip")).map((chip) =>
    (chip.textContent ?? "").replace("×", "").trim(),
  );

describe("ComboboxInput (presentational)", () => {
  it("renders an input", () => {
    render(<ComboboxInput options={fruits} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders chips for each value in multiple mode", () => {
    const { container } = render(
      <ComboboxInput
        isMultiple
        options={fruits}
        value={["apple", "banana", "cherry"]}
      />,
    );
    expect(chipLabels(container)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("supports the disabled state", () => {
    render(<ComboboxInput options={fruits} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});

/**
 * A form harness that both renders the field and exposes the values captured on
 * submit, so a test can assert the react-hook-form state — not just the DOM.
 * The DOM alone is insufficient here: the reset bug was a re-sync effect
 * resurrecting cleared chips from a stale RHF value, so the field value is the
 * thing under test.
 */
function ComboboxFormHarness({
  onSubmit,
  extraButton,
}: {
  onSubmit: (values: Record<string, unknown>) => void;
  extraButton?: React.ReactNode;
}) {
  const methods = useForm({
    defaultValues: { fruit: ["apple", "banana", "cherry"] },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <ComboboxField
          name="fruit"
          label="Fruit"
          isMultiple
          isOptional
          options={fruits}
        />
        {extraButton}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}

describe("ComboboxField (multiple) reset", () => {
  it("clears ALL selected chips when the reset button is clicked", () => {
    const { container } = render(<ComboboxFormHarness onSubmit={() => {}} />);

    // All three defaultValues render as chips.
    expect(chipLabels(container)).toEqual(["Apple", "Banana", "Cherry"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));

    // Not one, not the last — every chip is gone.
    expect(chipLabels(container)).toEqual([]);
  });

  it("clears the react-hook-form value (does not revert to defaultValues)", async () => {
    const onSubmit = vi.fn();
    const { container } = render(<ComboboxFormHarness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    // Submit the form element directly — the fields carry no validation rules,
    // so the empty selection is valid and handleSubmit invokes the callback.
    const form = container.querySelector("form");
    if (!form) throw new Error("form not rendered");
    fireEvent.submit(form);

    // react-hook-form's handleSubmit resolves asynchronously.
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // Emitting [] (not undefined) is what stops RHF falling back to the
    // defaultValue array and resurrecting the chips on the next render.
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ fruit: [] });
  });

  it("stays cleared after a parent re-render (the effect cannot resurrect it)", async () => {
    // A parent re-render re-runs the value→selectedItems sync effect. With the
    // old write-only effect + onChange(undefined), that re-supplied the default
    // array and repopulated the chips. Assert on the form value, not just the
    // DOM: in jsdom the synchronous setSelectedItems([]) clears the chips even
    // on the buggy code, so the resurrection only shows through the RHF value.
    const onSubmit = vi.fn();
    function Wrapper() {
      const [, forceRender] = useState(0);
      return (
        <ComboboxFormHarness
          onSubmit={onSubmit}
          extraButton={
            <button type="button" onClick={() => forceRender((n) => n + 1)}>
              Re-render
            </button>
          }
        />
      );
    }
    const { container } = render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    fireEvent.click(screen.getByRole("button", { name: "Re-render" }));

    expect(chipLabels(container)).toEqual([]);

    const form = container.querySelector("form");
    if (!form) throw new Error("form not rendered");
    fireEvent.submit(form);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ fruit: [] });
  });
});
