import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../../testing/renderWithForm.js";
import Checkbox from "./Checkbox.js";

describe("Checkbox", () => {
  it("renders a checkbox input", () => {
    renderWithForm(<Checkbox name="agree" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<Checkbox name="agree" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("name", "agree");
  });

  it("applies the component class", () => {
    renderWithForm(<Checkbox name="agree" />);
    expect(screen.getByRole("checkbox")).toHaveClass("form-checkbox");
  });

  it("supports disabled state", () => {
    renderWithForm(<Checkbox name="agree" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("supports default checked via form defaultValues", () => {
    renderWithForm(<Checkbox name="agree" />, {
      formProps: { defaultValues: { agree: true } },
    });
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
