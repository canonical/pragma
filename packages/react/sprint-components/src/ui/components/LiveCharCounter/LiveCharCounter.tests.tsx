/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./LiveCharCounter.js";

describe("LiveCharCounter component", () => {
  it("renders", () => {
    render(<Component>LiveCharCounter</Component>);
    expect(screen.getByText('LiveCharCounter')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>LiveCharCounter</Component>);
    expect(screen.getByText("LiveCharCounter")).toHaveClass("test-class");
  });
});