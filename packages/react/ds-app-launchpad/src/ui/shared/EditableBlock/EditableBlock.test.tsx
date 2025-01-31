/* @canonical/generator-ds 0.8.0-experimental.0 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./EditableBlock.js";

describe("EditableBlock component", () => {
  it("renders", () => {
    render(<Component>EditableBlock</Component>);
    expect(screen.getByText('EditableBlock')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>EditableBlock</Component>);
    expect(screen.getByText("EditableBlock")).toHaveClass("test-class");
  });
});