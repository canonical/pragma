import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select.js";

const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("Select (presentational)", () => {
  it("renders a select without a form context", () => {
    render(<Select name="color" options={options} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("applies the input chrome on the select element", () => {
    render(<Select name="color" options={options} />);
    expect(screen.getByRole("combobox")).toHaveClass(
      "ds",
      "input",
      "select",
      "chrome",
    );
  });

  it("renders all options", () => {
    render(<Select name="color" options={options} />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("supports disabled options", () => {
    const opts = [
      ...options,
      { label: "Disabled", value: "disabled", disabled: true },
    ];
    render(<Select name="color" options={opts} />);
    expect(screen.getByRole("option", { name: "Disabled" })).toBeDisabled();
  });

  it("is controllable via value/onChange", () => {
    const onChange = vi.fn();
    render(
      <Select
        name="color"
        options={options}
        value="blue"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("blue");
  });

  it("forwards a ref to the underlying select", () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select name="color" options={options} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("supports the disabled state", () => {
    render(<Select name="color" options={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
