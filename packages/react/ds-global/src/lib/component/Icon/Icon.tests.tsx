import { ICON_MANIFEST } from "@canonical/ds-assets";
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

  it("references the icon by its content-hashed filename from ICON_MANIFEST by default", () => {
    const { container } = render(<Component icon={"user"} />);
    const use = container.querySelector("use");
    expect(use).toHaveAttribute("href", `/icons/${ICON_MANIFEST.user}#user`);
  });

  it("prefers a manifest override over ICON_MANIFEST", () => {
    const { container } = render(
      <Component icon={"user"} manifest={{ user: "user.custom.svg" }} />,
    );
    const use = container.querySelector("use");
    expect(use).toHaveAttribute("href", "/icons/user.custom.svg#user");
  });

  it("falls back to ICON_MANIFEST for icons missing from a partial override", () => {
    const { container } = render(
      <Component icon={"user"} manifest={{ search: "search.custom.svg" }} />,
    );
    const use = container.querySelector("use");
    expect(use).toHaveAttribute("href", `/icons/${ICON_MANIFEST.user}#user`);
  });
});
