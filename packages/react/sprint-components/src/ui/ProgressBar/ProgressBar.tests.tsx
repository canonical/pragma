/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./ProgressBar.js";

describe("ProgressBar component", () => {
  it("renders", () => {
    render(<Component percentage={23} id="ProgressBar" />);
    expect(screen.getByTitle("Progress 23% done")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component percentage={42} className="test-class" />);
    expect(screen.getByTitle("Progress 42% done")).toHaveClass("test-class");
  });
});
