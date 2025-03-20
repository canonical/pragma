/* @canonical/generator-ds 0.9.0-experimental.9 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Select.js";

describe("Select component", () => {
  it("renders", () => {
    render(<Component>Select</Component>);
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Select</Component>);
    expect(screen.getByText("Select")).toHaveClass("test-class");
  });
});