import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { ChoicesField } from "./index.js";

const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

describe("ChoicesField", () => {
  it("renders radio inputs by default", () => {
    renderWithForm(<ChoicesField name="color" options={options} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("renders checkbox inputs when isMultiple", () => {
    renderWithForm(<ChoicesField name="colors" options={options} isMultiple />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("renders labels for each option", () => {
    renderWithForm(<ChoicesField name="color" options={options} />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });

  it("supports disabled state on all options", () => {
    renderWithForm(<ChoicesField name="color" options={options} disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });

  it("supports per-option disabled", () => {
    const opts = [
      ...options,
      { label: "Disabled", value: "disabled", disabled: true },
    ];
    renderWithForm(<ChoicesField name="color" options={opts} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getAllByRole("radio")[3]).toBeDisabled();
  });

  it("selects a radio option on click", () => {
    renderWithForm(<ChoicesField name="color" options={options} />);
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });
});
