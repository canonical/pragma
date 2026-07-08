import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Announcement from "./Announcement.js";

describe("Announcement", () => {
  it("renders content", () => {
    render(<Announcement criticality="information">Test content</Announcement>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders an optional heading", () => {
    render(
      <Announcement criticality="information" heading="Subject">
        Body
      </Announcement>,
    );
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("omits the heading when not provided", () => {
    const { container } = render(
      <Announcement criticality="information">Body</Announcement>,
    );
    expect(container.querySelector(".heading")).toBeNull();
  });

  it("applies the criticality modifier class", () => {
    const { container } = render(
      <Announcement criticality="error">Body</Announcement>,
    );
    expect(container.querySelector(".ds.announcement")).toHaveClass("error");
  });

  it("applies custom className", () => {
    const { container } = render(
      <Announcement criticality="information" className="custom-class">
        Content
      </Announcement>,
    );
    const root = container.querySelector(".ds.announcement");
    expect(root).toHaveClass("custom-class");
  });

  it("passes through additional props", () => {
    render(
      <Announcement criticality="information" data-testid="test-component">
        Content
      </Announcement>,
    );
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
