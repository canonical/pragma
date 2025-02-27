/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Tooltip.js";

describe("Tooltip component", () => {
  it("renders", () => {
    render(<Component>Tooltip</Component>);
    expect(screen.getByText("Tooltip")).toBeInTheDocument();
  });

  it("child is tooltip target", () => {
    render(<Component>Tooltip</Component>);
    expect(screen.getByText("Tooltip")).toHaveClass("ds tooltip-target");
  });
});
