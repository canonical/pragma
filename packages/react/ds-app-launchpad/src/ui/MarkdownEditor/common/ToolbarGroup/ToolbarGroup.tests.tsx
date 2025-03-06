/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./ToolbarGroup.js";

describe("ToolbarGroup component", () => {
  it("renders", () => {
    render(<Component label="test">ToolbarGroup</Component>);
    expect(screen.getByText("ToolbarGroup")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(
      <Component label="test" className={"test-class"}>
        ToolbarGroup
      </Component>,
    );
    expect(screen.getByText("ToolbarGroup")).toHaveClass("test-class");
  });
});
