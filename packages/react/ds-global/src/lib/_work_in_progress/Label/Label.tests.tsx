import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Label from "./Label.js";

describe("Label", () => {
  it("renders children", () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("applies ds label class", () => {
    render(<Label>Label</Label>);
    const label = screen.getByText("Label");
    expect(label).toHaveClass("ds", "label");
  });

  it("applies criticality modifier class", () => {
    render(<Label criticality="warning">Warning</Label>);
    const label = screen.getByText("Warning");
    expect(label).toHaveClass("ds", "label", "warning");
  });

  it("applies custom className", () => {
    render(<Label className="custom">Label</Label>);
    const label = screen.getByText("Label");
    expect(label).toHaveClass("ds", "label", "custom");
  });

  it("renders as span element", () => {
    render(<Label>Label</Label>);
    const label = screen.getByText("Label");
    expect(label.tagName).toBe("SPAN");
  });

  it("passes through HTML attributes", () => {
    render(<Label data-testid="my-label">Label</Label>);
    expect(screen.getByTestId("my-label")).toBeInTheDocument();
  });
});
