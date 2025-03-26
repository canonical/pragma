/* @canonical/generator-ds 0.9.0-experimental.9 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./ResetButton.js";

describe("ResetButton component", () => {
  it("renders", () => {
    render(<Component>ResetButton</Component>);
    expect(screen.getByText('ResetButton')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>ResetButton</Component>);
    expect(screen.getByText("ResetButton")).toHaveClass("test-class");
  });
});