/* @canonical/generator-ds 0.9.0-experimental.9 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Range.js";

describe("Range component", () => {
  it("renders", () => {
    render(<Component>Range</Component>);
    expect(screen.getByText('Range')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Range</Component>);
    expect(screen.getByText("Range")).toHaveClass("test-class");
  });
});