import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Choices } from "./Choices.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>) and driven purely by value/onChange.
const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

describe("Choices (presentational)", () => {
  it("renders a fieldset of radio inputs by default", () => {
    const { container } = render(<Choices name="color" options={options} />);
    expect(container.querySelector("fieldset")).toHaveClass(
      "ds",
      "form-choices",
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("renders checkbox inputs when isMultiple", () => {
    render(<Choices name="colors" options={options} isMultiple />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("renders a label for each option", () => {
    render(<Choices name="color" options={options} />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });

  it("applies the layout class", () => {
    const { container } = render(
      <Choices name="color" options={options} layout="stacked" />,
    );
    expect(container.querySelector("fieldset")).toHaveClass("stacked");
  });

  it("reflects the selected value (single)", () => {
    render(<Choices name="color" options={options} value="blue" />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
  });

  it("reflects the selected values (multiple)", () => {
    render(
      <Choices
        name="colors"
        options={options}
        isMultiple
        value={["red", "green"]}
      />,
    );
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
    expect(boxes[2]).toBeChecked();
  });

  it("calls onChange with the option value on click (single)", () => {
    const onChange = vi.fn();
    render(<Choices name="color" options={options} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onChange).toHaveBeenCalledWith("blue");
  });

  it("toggles a value into the array on click (multiple)", () => {
    const onChange = vi.fn();
    render(
      <Choices
        name="colors"
        options={options}
        isMultiple
        value={["red"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole("checkbox")[2]);
    expect(onChange).toHaveBeenCalledWith(["red", "green"]);
  });

  it("toggles a value out of the array on click (multiple)", () => {
    const onChange = vi.fn();
    render(
      <Choices
        name="colors"
        options={options}
        isMultiple
        value={["red", "green"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(onChange).toHaveBeenCalledWith(["green"]);
  });

  it("supports disabled state on all options", () => {
    render(<Choices name="color" options={options} disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });

  it("supports per-option disabled", () => {
    const opts = [
      ...options,
      { label: "Disabled", value: "disabled", disabled: true },
    ];
    render(<Choices name="color" options={opts} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getAllByRole("radio")[3]).toBeDisabled();
  });
});
