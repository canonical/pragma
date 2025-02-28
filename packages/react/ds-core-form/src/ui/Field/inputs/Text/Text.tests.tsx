/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Text.js";

describe("Text component", () => {
  it("renders", () => {
    render(<Component name="full_name" />);
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(
      <Component className={"test-class"} name="email" inputType="email" />,
    );
    expect(screen.getByText("Text")).toHaveClass("test-class");
  });
});
