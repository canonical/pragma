import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SidePanel from "./SidePanel.js";

describe("SidePanel component", () => {
  it("renders", () => {
    render(<SidePanel>SidePanel</SidePanel>);
    expect(screen.getByText("SidePanel")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<SidePanel className="test-class">SidePanel</SidePanel>);
    expect(screen.getByText("SidePanel")).toHaveClass("test-class");
  });
});
