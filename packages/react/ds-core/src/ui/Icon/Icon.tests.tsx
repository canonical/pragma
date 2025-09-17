/* @canonical/generator-ds 0.10.0-experimental.2 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Icon.js";

describe("Icon component", () => {
  it("renders", () => {
    render(<Component>Icon</Component>);
    expect(screen.getByText("Icon")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Icon</Component>);
    expect(screen.getByText("Icon")).toHaveClass("test-class");
  });
});
