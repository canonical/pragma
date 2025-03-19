/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Wrapper.js";

describe("Wrapper component", () => {
  it("renders", () => {
    render(<Component>Wrapper</Component>);
    expect(screen.getByText("Wrapper")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Wrapper</Component>);
    expect(screen.getByText("Wrapper")).toHaveClass("test-class");
  });
});
