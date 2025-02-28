/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Field.js";
import { InputType } from "./types.js";

describe("Field component", () => {
  it("renders", () => {
    render(<Component inputType={InputType.Text}>Field</Component>);
    expect(screen.getByText("Field")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component inputType={InputType.Textarea}>Field</Component>);
    expect(screen.getByText("Field")).toHaveClass("test-class");
  });
});
