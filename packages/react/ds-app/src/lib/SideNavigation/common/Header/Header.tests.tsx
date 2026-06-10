import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header.js";

describe("Header", () => {
  it("renders brand content", () => {
    render(<Header brand="Test content" />);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies the base and custom class to the root", () => {
    const { container } = render(
      <Header className="custom-class" brand="Content" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("ds side-navigation-header");
    expect(root?.className).toContain("custom-class");
  });

  it("passes through additional props", () => {
    render(<Header data-testid="test-component" brand="Content" />);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });

  it("does not render the collapse toggle without an onToggle handler", () => {
    render(<Header brand="Content" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the collapse toggle when onToggle is provided", () => {
    const onToggle = vi.fn();
    render(
      <Header
        expanded
        onToggle={onToggle}
        collapseControls="nav-content"
        brand="Content"
      />,
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-controls", "nav-content");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
