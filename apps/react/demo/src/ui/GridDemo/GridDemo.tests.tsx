/* @canonical/generator-ds 0.10.0-experimental.5 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./GridDemo.js";

describe("GridDemo component", () => {
  it("renders", () => {
    render(<Component>GridDemo</Component>);
    expect(screen.getByText('GridDemo')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>GridDemo</Component>);
    expect(screen.getByText("GridDemo")).toHaveClass("test-class");
  });
});