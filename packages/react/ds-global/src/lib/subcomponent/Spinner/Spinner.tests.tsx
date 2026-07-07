import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Spinner.js";

describe("Spinner subcomponent", () => {
  it("renders the spinner icon", () => {
    const { container } = render(<Component />);
    expect(container.querySelector("use")).toHaveAttribute(
      "href",
      "/icons/spinner.svg#spinner",
    );
  });

  it("applies the spinner class", () => {
    const { container } = render(<Component />);
    expect(container.querySelector("svg")).toHaveClass("ds", "spinner");
  });

  it("is decorative by default", () => {
    const { container } = render(<Component />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("exposes a named image when aria-label is provided", () => {
    render(<Component aria-label="Loading" />);
    const svg = screen.getByRole("img", { name: "Loading" });
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("treats an empty aria-label as decorative", () => {
    const { container } = render(
      // biome-ignore lint/a11y/useValidAriaValues: deliberately exercising the empty-label degenerate input
      <Component aria-label="" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("honours an explicit role", () => {
    render(<Component role="presentation" />);
    const svg = screen.getByRole("presentation");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("merges a consumer className alongside the spinner class", () => {
    const { container } = render(<Component className="test-class" />);
    expect(container.querySelector("svg")).toHaveClass("spinner", "test-class");
  });

  it("resolves the icon from a custom rootPath", () => {
    const { container } = render(<Component rootPath="/assets/icons" />);
    expect(container.querySelector("use")).toHaveAttribute(
      "href",
      "/assets/icons/spinner.svg#spinner",
    );
  });
});
