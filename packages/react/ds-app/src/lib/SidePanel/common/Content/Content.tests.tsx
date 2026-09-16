import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Content from "./Content.js";

describe("SidePanel.Content", () => {
  it("renders children", () => {
    render(<Content>Test content</Content>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies the base and custom class", () => {
    render(<Content className="custom-class">Body</Content>);
    const element = screen.getByText("Body");
    expect(element.className).toContain("ds side-panel-content");
    expect(element.className).toContain("custom-class");
  });

  it("passes through additional props", () => {
    render(<Content data-testid="test-component">Body</Content>);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
