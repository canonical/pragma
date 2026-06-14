import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { SelectField } from "./index.js";

const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

// Field-tier tests: the connected component bound to react-hook-form.
describe("SelectField", () => {
  it("renders a select element", () => {
    renderWithForm(<SelectField name="color" options={options} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders all options", () => {
    renderWithForm(<SelectField name="color" options={options} />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<SelectField name="color" options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("name", "color");
  });

  it("supports disabled options", () => {
    const opts = [
      ...options,
      { label: "Disabled", value: "disabled", disabled: true },
    ];
    renderWithForm(<SelectField name="color" options={opts} />);
    expect(screen.getByRole("option", { name: "Disabled" })).toBeDisabled();
  });

  it("supports disabled state", () => {
    renderWithForm(<SelectField name="color" options={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("changes value on selection", () => {
    renderWithForm(<SelectField name="color" options={options} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "blue" } });
    expect(select).toHaveValue("blue");
  });
});
