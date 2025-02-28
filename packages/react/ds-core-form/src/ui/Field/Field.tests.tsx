/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Field.js";

describe("Field component", () => {
  it("renders", () => {
    render(<Component>Field</Component>);
    expect(screen.getByText('Field')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Field</Component>);
    expect(screen.getByText("Field")).toHaveClass("test-class");
  });
});