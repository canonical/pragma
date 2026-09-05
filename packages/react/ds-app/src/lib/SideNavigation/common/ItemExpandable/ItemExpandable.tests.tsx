import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ItemExpandable from "./ItemExpandable.js";

describe("ItemExpandable", () => {
  it("renders the heading and, when expanded, its children", () => {
    render(
      <ItemExpandable heading="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Machines")).toBeInTheDocument();
  });

  it("starts closed by default", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware">
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("starts open when defaultExpanded is set", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("toggles open/closed when the summary is activated", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware">
        <li>Machines</li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = container.querySelector("summary") as HTMLElement;

    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("ignores toggling when disabled", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware" disabled>
        <li>Machines</li>
      </ItemExpandable>,
    );
    const li = container.firstElementChild;
    expect(li).toHaveAttribute("data-disabled");

    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = container.querySelector("summary") as HTMLElement;
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware" className="custom-class" />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation-item-expandable");
    expect(el?.className).toContain("custom-class");
  });

  it("gates the caret's rotation transition behind prefers-reduced-motion (SPEC.md §6)", () => {
    // jsdom doesn't apply this package's CSS (confirmed in PR3/PR6 — nested
    // `&` rules and @media blocks aren't evaluated against computed styles
    // here), so this asserts the guard exists in the stylesheet source
    // rather than a computed transition value. Vitest runs with cwd at the
    // package root, so a cwd-relative path resolves reliably regardless of
    // how the test module's own URL is transformed.
    const css = readFileSync(
      join(
        process.cwd(),
        "src/lib/SideNavigation/common/ItemExpandable/styles.css",
      ),
      "utf-8",
    );
    const mediaBlockStart = css.indexOf(
      "@media (prefers-reduced-motion: no-preference)",
    );
    expect(mediaBlockStart).toBeGreaterThan(-1);
    const transitionIndex = css.indexOf("transition: transform");
    expect(transitionIndex).toBeGreaterThan(mediaBlockStart);
  });
});
