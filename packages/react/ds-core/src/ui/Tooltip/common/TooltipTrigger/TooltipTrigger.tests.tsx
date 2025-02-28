/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./TooltipTrigger.js";

describe("TooltipTrigger component", () => {
  it("renders", () => {
    render(<Component>TooltipTrigger</Component>);
    expect(screen.getByText("TooltipTrigger")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>TooltipTrigger</Component>);
    expect(screen.getByText("TooltipTrigger")).toHaveClass("test-class");
  });
});
