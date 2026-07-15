import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Icon.js";

describe("Icon component", () => {
  it("renders decoratively by default", () => {
    const { container } = render(<Component icon={"user"} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(svg).not.toHaveAttribute("aria-label");
  });

  it("exposes a named image when aria-label is provided", () => {
    render(<Component icon={"user"} aria-label="User profile" />);
    const svg = screen.getByRole("img", { name: "User profile" });
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("treats an empty aria-label as decorative", () => {
    const { container } = render(
      // biome-ignore lint/a11y/useValidAriaValues: deliberately exercising the empty-label degenerate input
      <Component icon={"user"} aria-label="" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("honours an explicit role", () => {
    render(<Component icon={"user"} role="presentation" />);
    const svg = screen.getByRole("presentation");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("applies className", () => {
    const { container } = render(
      <Component icon={"user"} className={"test-class"} />,
    );
    expect(container.querySelector("svg")).toHaveClass("test-class");
  });

  it("applies the animate modifier class", () => {
    const { container } = render(
      <Component icon={"spinner"} animate={"spin"} />,
    );
    expect(container.querySelector("svg")).toHaveClass("spin");
  });
});
