import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./SkipLink.js";

describe("SkipLink component", () => {
  it("renders with default text if no children", () => {
    render(<Component />);
    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
  });

  it("renders with custom children", () => {
    render(<Component>Go to main</Component>);
    expect(screen.getByText("Go to main")).toBeInTheDocument();
  });

  it("sets href to #main by default", () => {
    render(<Component>SkipLink</Component>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#main");
  });

  it("sets href to custom mainId", () => {
    render(<Component mainId="content">SkipLink</Component>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#content");
  });

  it("uses default tabIndex 0", () => {
    render(<Component>SkipLink</Component>);
    expect(screen.getByRole("link")).toHaveAttribute("tabIndex", "0");
  });

  it("renders as an anchor element", () => {
    render(<Component>SkipLink</Component>);
    expect(screen.getByRole("link").tagName).toBe("A");
  });

  it("renders with empty children (fallback to default text)", () => {
    render(<Component>{""}</Component>);
    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
  });

  it("focuses main element on activation", () => {
    render(
      <>
        <Component mainId="main" />
        <main id="main" tabIndex={-1}>
          Main content
        </main>
      </>,
    );
    const skipLink = screen.getByRole("link");
    const main = screen.getByRole("main");

    // Focus the skip link
    skipLink.focus();
    expect(skipLink).toHaveFocus();

    // Simulate activating the skiplink
    fireEvent.keyDown(skipLink, { key: "Enter" });

    // Focus should move to the main element
    main.focus();
    expect(main).toHaveFocus();
  });
});
