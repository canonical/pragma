import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../../testing/renderWithForm.js";
import Select from "./Select.js";

const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

describe("Select", () => {
  it("renders a select element", () => {
    renderWithForm(<Select name="color" options={options} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders all options", () => {
    renderWithForm(<Select name="color" options={options} />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<Select name="color" options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("name", "color");
  });

  it("supports disabled options", () => {
    const opts = [
      ...options,
      { label: "Disabled", value: "disabled", disabled: true },
    ];
    renderWithForm(<Select name="color" options={opts} />);
    expect(screen.getByRole("option", { name: "Disabled" })).toBeDisabled();
  });

  it("supports disabled state", () => {
    renderWithForm(<Select name="color" options={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
