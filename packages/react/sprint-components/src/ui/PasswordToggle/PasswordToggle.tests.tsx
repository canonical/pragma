/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./PasswordToggle.js";

describe("PasswordToggle component", () => {
  it("renders show buttons", () => {
    render(<Component></Component>);
    expect(screen.getByText("Show")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}></Component>);
    expect(screen.getByText("Show")).toHaveClass("test-class");
  });
});