/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Textarea.js";

describe("Textarea component", () => {
  it("renders", () => {
    render(<Component name="content">Textarea</Component>);
    expect(screen.getByText("Textarea")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"} name="content" />);
    expect(screen.getByText("Textarea")).toHaveClass("test-class");
  });
});
