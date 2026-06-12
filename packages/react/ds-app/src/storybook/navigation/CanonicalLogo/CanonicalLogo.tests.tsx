import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CanonicalLogo from "./CanonicalLogo.js";

describe("CanonicalLogo", () => {
  it("renders a home link with the mark", () => {
    const { container } = render(<CanonicalLogo />);
    const root = container.firstElementChild as HTMLAnchorElement;
    expect(root.tagName).toBe("A");
    expect(root.getAttribute("href")).toBe("/");
    expect(root.querySelector("img.mark")).not.toBeNull();
  });

  it("applies the base and custom class to the root", () => {
    const { container } = render(<CanonicalLogo className="custom-class" />);
    const root = container.firstElementChild;
    expect(root?.className).toContain("ds canonical-logo");
    expect(root?.className).toContain("custom-class");
  });

  it("honours a custom href", () => {
    const { container } = render(<CanonicalLogo href="/home" />);
    expect(container.firstElementChild?.getAttribute("href")).toBe("/home");
  });

  it("passes through additional props", () => {
    const { container } = render(<CanonicalLogo data-testid="logo" />);
    expect(container.querySelector('[data-testid="logo"]')).not.toBeNull();
  });
});
