import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { CheckboxField } from "./index.js";

describe("CheckboxField", () => {
  it("renders a checkbox input", () => {
    renderWithForm(<CheckboxField name="agree" label="Agree" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<CheckboxField name="agree" label="Agree" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("name", "agree");
  });

  it("applies the component class", () => {
    renderWithForm(<CheckboxField name="agree" label="Agree" />);
    expect(screen.getByRole("checkbox")).toHaveClass("form-checkbox");
  });

  it("supports disabled state", () => {
    renderWithForm(<CheckboxField name="agree" label="Agree" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("supports default checked via form defaultValues", () => {
    renderWithForm(<CheckboxField name="agree" label="Agree" />, {
      formProps: { defaultValues: { agree: true } },
    });
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("toggles on click", () => {
    renderWithForm(<CheckboxField name="agree" label="Agree" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
