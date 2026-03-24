import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Announcement from "./Announcement.js";

describe("Announcement", () => {
  it("renders children", () => {
    render(<Announcement>Test content</Announcement>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies the base class name", () => {
    render(<Announcement>Content</Announcement>);
    const element = screen.getByRole("alert");
    expect(element.className).toContain("ds announcement");
  });

  it("applies custom className", () => {
    render(<Announcement className="custom-class">Content</Announcement>);
    const element = screen.getByRole("alert");
    expect(element.className).toContain("ds announcement");
    expect(element.className).toContain("custom-class");
  });

  it("has role alert", () => {
    render(<Announcement>Content</Announcement>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("passes through additional props", () => {
    render(<Announcement data-testid="test-component">Content</Announcement>);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
