/* @canonical/generator-ds 0.10.0-experimental.5 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Anatomy.js";

describe("Anatomy component", () => {
  it("renders", () => {
    render(<Component>Anatomy</Component>);
    expect(screen.getByText("Anatomy")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Anatomy</Component>);
    expect(screen.getByText("Anatomy")).toHaveClass("test-class");
  });
});
