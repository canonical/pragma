/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToolbarGroup from "./ToolbarGroup.js";

describe("ToolbarGroup component", () => {
  it("renders", () => {
    render(<ToolbarGroup label="test">ToolbarGroup</ToolbarGroup>);
    expect(screen.getByText("ToolbarGroup")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(
      <ToolbarGroup label="test" className={"test-class"}>
        ToolbarGroup
      </ToolbarGroup>,
    );
    expect(screen.getByText("ToolbarGroup")).toHaveClass("test-class");
  });
});
