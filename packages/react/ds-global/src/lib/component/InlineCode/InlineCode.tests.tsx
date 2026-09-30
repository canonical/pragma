import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InlineCode from "./InlineCode.js";

describe("InlineCode", () => {
  it("renders children", () => {
    render(<InlineCode>Test content</InlineCode>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<InlineCode className="custom-class">Content</InlineCode>);
    const element = screen.getByText("Content");
    expect(element.className).toContain("ds inline-code");
    expect(element.className).toContain("custom-class");
  });

  it("passes through additional props", () => {
    render(<InlineCode data-testid="test-component">Content</InlineCode>);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
