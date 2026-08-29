import { screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import PhoneField from "./PhoneField.js";

/** Calls `setFocus` once mounted, which only works if RHF holds the DOM node. */
function FocusOnMount({ name }: { name: string }) {
  const { setFocus } = useFormContext();
  useEffect(() => {
    setFocus(name);
  }, [setFocus, name]);
  return null;
}

describe("PhoneField", () => {
  it("renders the phone input with its label", () => {
    renderWithForm(<PhoneField name="phone" label="Phone" />);
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
  });

  it("gives react-hook-form a real element, so setFocus reaches the input", async () => {
    // The binding hands `ref: field.ref` to the presentational input. While that
    // input ignored it, RHF's reference stayed the bare `{ name }` placeholder
    // with no `focus` method, so setFocus and focus-on-first-error both did
    // nothing at all for this field.
    renderWithForm(
      <>
        <PhoneField name="phone" label="Phone" />
        <FocusOnMount name="phone" />
      </>,
    );

    // RHF defers the focus call to a timeout, so this cannot be asserted
    // synchronously.
    await waitFor(() =>
      expect(screen.getByLabelText("Phone number")).toHaveFocus(),
    );
  });
});
