import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Marker from "./Marker.js";

describe("Timeline.Marker", () => {
  it("applies size and base classes", () => {
    render(<Marker data-testid="marker" size="large" />);
    expect(screen.getByTestId("marker")).toHaveClass(
      "ds",
      "timeline-marker",
      "large",
    );
  });

  it("defaults to medium size", () => {
    render(<Marker data-testid="marker" />);
    expect(screen.getByTestId("marker")).toHaveClass("medium");
  });

  it("renders an image marker with alt text", () => {
    render(<Marker imageUrl="/avatar.png" alt="Jane" data-testid="marker" />);
    expect(screen.getByAltText("Jane")).toHaveAttribute("src", "/avatar.png");
  });

  it("falls back to the generic user icon when an image has no alt", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Marker imageUrl="/avatar.png" data-testid="marker" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("renders initials", () => {
    render(<Marker initials="JD" data-testid="marker" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders a custom graphic", () => {
    render(<Marker customGraphic={<b>B</b>} data-testid="marker" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("small renders the bare outlined box", () => {
    render(<Marker size="small" initials="JD" data-testid="marker" />);
    const marker = screen.getByTestId("marker");
    expect(marker).toHaveClass("small");
    expect(marker.childElementCount).toBe(0);
  });

  it("wraps the graphic in a link when href is set", () => {
    render(<Marker href="/profile" label="Jane Doe" data-testid="marker" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/profile");
    expect(link).toHaveAccessibleName("Jane Doe");
  });

  it("never renders an empty link for a small marker", () => {
    render(
      <Marker
        size="small"
        href="/profile"
        label="Jane Doe"
        data-testid="marker"
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("applies custom className", () => {
    render(<Marker className="custom" data-testid="marker" />);
    expect(screen.getByTestId("marker")).toHaveClass("custom");
  });
});
