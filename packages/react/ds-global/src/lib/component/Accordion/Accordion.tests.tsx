import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Accordion from "./Accordion.js";

describe("Accordion", () => {
  it("renders with children", () => {
    render(
      <Accordion>
        <Accordion.Item heading="Test Heading">Test Content</Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByText("Test Heading")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Accordion className="custom-class">
        <Accordion.Item heading="Test">Content</Accordion.Item>
      </Accordion>,
    );
    expect(container.firstChild).toHaveClass("ds", "accordion", "custom-class");
  });

  it("passes through additional props", () => {
    render(
      <Accordion data-testid="test-accordion">
        <Accordion.Item heading="Test">Content</Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByTestId("test-accordion")).toBeInTheDocument();
  });
});

describe("Accordion.Item", () => {
  it("renders as a native <details>/<summary>", () => {
    const { container } = render(
      <Accordion>
        <Accordion.Item heading="Test Heading">Test Content</Accordion.Item>
      </Accordion>,
    );
    const details = container.querySelector("details.ds.accordion-item");
    expect(details).toBeInTheDocument();
    expect(details?.querySelector("summary.header")).toBeInTheDocument();
    expect(screen.getByText("Test Heading")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("reflects `expanded` on the native `open` attribute", () => {
    const { container, rerender } = render(
      <Accordion>
        <Accordion.Item heading="Test">Content</Accordion.Item>
      </Accordion>,
    );
    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");

    rerender(
      <Accordion>
        <Accordion.Item heading="Test" expanded>
          Content
        </Accordion.Item>
      </Accordion>,
    );
    expect(details).toHaveAttribute("open");
  });

  it("calls onExpandedChange with the native open state on toggle", () => {
    const onExpandedChange = vi.fn();
    const { container } = render(
      <Accordion>
        <Accordion.Item heading="Test" onExpandedChange={onExpandedChange}>
          Content
        </Accordion.Item>
      </Accordion>,
    );
    const details = container.querySelector("details");
    if (!details) throw new Error("expected a <details> element");

    // Simulate the browser toggling the details open, then firing `toggle`.
    details.open = true;
    fireEvent(details, new Event("toggle", { bubbles: false }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    details.open = false;
    fireEvent(details, new Event("toggle", { bubbles: false }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("lets the consumer supply heading semantics as a node", () => {
    render(
      <Accordion>
        <Accordion.Item heading={<h3>Section</h3>}>Content</Accordion.Item>
      </Accordion>,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Section" }),
    ).toBeInTheDocument();
  });
});

describe("Accordion.Item styles contract: header surface stepping", () => {
  // The header hover/active surface stepping is pure CSS (Chromatic owns the
  // visual gate), so this asserts the stylesheet's contract directly: the
  // built surfaces modifier exposes no ghost hover/active channel, so the
  // component itself must re-point its hover/active tokens at the layered
  // state tokens per surface nesting depth (the OnSurfaces story regression).
  const stylesheet = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "common",
      "Item",
      "styles.css",
    ),
    "utf-8",
  )
    // Normalise formatting so assertions survive line wrapping.
    .replace(/\s+/g, " ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");

  it("prefers the surface hover/active channels with token fallbacks", () => {
    expect(stylesheet).toContain(
      "background-color: var(--surface-color-foreground-ghost-hover, var(--accordion-item-header-background-hover));",
    );
    expect(stylesheet).toContain(
      "background-color: var(--surface-color-foreground-ghost-active, var(--accordion-item-header-background-active));",
    );
  });

  it("steps hover/active to the layer2 tokens on doubly nested surfaces", () => {
    expect(stylesheet).toContain(
      ".surface .surface .ds.accordion-item { --accordion-item-header-background-hover: var(--color-foreground-ghost-layer2-hover); --accordion-item-header-background-active: var(--color-foreground-ghost-layer2-active); }",
    );
  });

  it("steps hover/active to the layer3 tokens on triply nested surfaces", () => {
    expect(stylesheet).toContain(
      ".surface .surface .surface .ds.accordion-item { --accordion-item-header-background-hover: var(--color-foreground-ghost-layer3-hover); --accordion-item-header-background-active: var(--color-foreground-ghost-layer3-active); }",
    );
  });
});
