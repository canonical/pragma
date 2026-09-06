import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Icon.js";

/**
 * `Icon.mdx` hands `ICON_METADATA` straight to the `IconExplorer` docs block.
 * MDX sits outside every `tsconfig` include, so nothing else would notice if
 * the two shapes drifted apart. This pins the assignment at compile time.
 */
type IconMetadataFitsExplorer =
  typeof import("@canonical/ds-assets")["ICON_METADATA"] extends Readonly<
    Record<string, import("@canonical/storybook-helpers").IconExplorerMetadata>
  >
    ? true
    : never;
const iconMetadataFitsExplorer: IconMetadataFitsExplorer = true;
void iconMetadataFitsExplorer;

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
});
