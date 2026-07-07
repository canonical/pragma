import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { SwitchField } from "./index.js";

describe("SwitchField", () => {
  it("renders a switch input", () => {
    renderWithForm(<SwitchField name="notify" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<SwitchField name="notify" />);
    expect(screen.getByRole("switch")).toHaveAttribute("name", "notify");
  });

  it("applies the component class", () => {
    renderWithForm(<SwitchField name="notify" />);
    expect(screen.getByRole("switch")).toHaveClass("form-switch");
  });

  it("supports disabled state", () => {
    renderWithForm(<SwitchField name="notify" disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("supports default checked via form defaultValues", () => {
    renderWithForm(<SwitchField name="notify" />, {
      formProps: { defaultValues: { notify: true } },
    });
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("toggles on click", () => {
    renderWithForm(<SwitchField name="notify" />);
    const toggle = screen.getByRole("switch");
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});
