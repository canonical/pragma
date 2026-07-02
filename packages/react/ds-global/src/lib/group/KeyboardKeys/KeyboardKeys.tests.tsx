import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KeyboardKeys from "./KeyboardKeys.js";

describe("KeyboardKeys", () => {
  it("renders children", () => {
    render(<KeyboardKeys>Test content</KeyboardKeys>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<KeyboardKeys className="custom-class">Content</KeyboardKeys>);
    const element = screen.getByText("Content");
    expect(element.className).toContain("ds keyboard-keys");
    expect(element.className).toContain("custom-class");
  });

  it("passes through additional props", () => {
    render(<KeyboardKeys data-testid="test-component">Content</KeyboardKeys>);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
