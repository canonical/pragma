import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Chip from "./Chip.js";

describe("Chip", () => {
  it("renders as a non-interactive span without an href", () => {
    render(
      <Chip kind="component" label="Button" uri="ds:global.component.button" />,
    );
    const chip = screen.getByText("Button");
    expect(chip.tagName).toBe("SPAN");
    expect(chip).not.toHaveAttribute("role");
    expect(chip).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as a link with an href", () => {
    render(
      <Chip
        href="/components/button"
        kind="component"
        label="Button"
        uri="ds:global.component.button"
      />,
    );
    const chip = screen.getByRole("link", { name: "Button" });
    expect(chip).toHaveAttribute("href", "/components/button");
  });

  it("keeps a paragraph's textContent intact — chips read as plain text", () => {
    // Bet H1: ignored, a chip never blocks the reading path. The summary
    // must not leak into the text either (it is a title, not a text node).
    render(
      <p data-testid="prose">
        Use the{" "}
        <Chip
          href="/components/button"
          kind="component"
          label="Button"
          lifecycle="canonical"
          summary="The primary action component."
          uri="ds:global.component.button"
        />{" "}
        component with the{" "}
        <Chip
          box="class"
          kind="standard"
          label="imports"
          uri="cs:typescript.imports"
        />{" "}
        standard.
      </p>,
    );
    expect(screen.getByTestId("prose").textContent).toBe(
      "Use the Button component with the imports standard.",
    );
  });

  it("derives the namespace from the uri prefix by default", () => {
    render(
      <Chip kind="standard" label="imports" uri="cs:typescript.imports" />,
    );
    expect(screen.getByText("imports")).toHaveAttribute("data-namespace", "cs");
  });

  it("lets an explicit namespace override the uri prefix", () => {
    render(
      <Chip
        kind="standard"
        label="imports"
        namespace="docs"
        uri="cs:typescript.imports"
      />,
    );
    expect(screen.getByText("imports")).toHaveAttribute(
      "data-namespace",
      "docs",
    );
  });

  it("exposes its identity and channel values as data attributes", () => {
    render(
      <Chip kind="component" label="Button" uri="ds:global.component.button" />,
    );
    const chip = screen.getByText("Button");
    expect(chip).toHaveAttribute("data-uri", "ds:global.component.button");
    expect(chip).toHaveAttribute("data-kind", "component");
    // The defaults: a mention names an instance and asserts no lifecycle.
    expect(chip).toHaveAttribute("data-box", "instance");
    expect(chip).toHaveAttribute("data-lifecycle", "none");
  });

  it("sets one custom property per encoding channel", () => {
    render(
      <Chip
        box="class"
        kind="pattern"
        label="Modal form"
        lifecycle="beta"
        uri="ds:global.pattern.modal-form"
      />,
    );
    const style = screen.getByText("Modal form").style;
    expect(style.getPropertyValue("--chip-tint")).toContain("--chip-tint-ds");
    expect(style.getPropertyValue("--chip-radius")).toBe("1.25em");
    expect(style.getPropertyValue("--chip-fill-weight")).toBe("0%");
    expect(style.getPropertyValue("--chip-stroke-weight")).toBe("80%");
    expect(style.getPropertyValue("--chip-dot")).toContain("--chip-dot-beta");
  });

  it("shows the summary as a hover peek via title", () => {
    render(
      <Chip
        kind="term"
        label="density"
        summary="How tightly a layout packs its controls."
        uri="docs:glossary.density"
      />,
    );
    expect(screen.getByText("density")).toHaveAttribute(
      "title",
      "How tightly a layout packs its controls.",
    );
  });

  it("omits the title when no summary is given", () => {
    render(<Chip kind="term" label="density" uri="docs:glossary.density" />);
    expect(screen.getByText("density")).not.toHaveAttribute("title");
  });

  it("calls onNavigate with the uri when the link is clicked", () => {
    const handleNavigate = vi.fn(
      (_uri: string, event: { preventDefault: () => void }) => {
        // Prevent jsdom from attempting real navigation.
        event.preventDefault();
      },
    );
    render(
      <Chip
        href="/components/button"
        kind="component"
        label="Button"
        onNavigate={handleNavigate}
        uri="ds:global.component.button"
      />,
    );
    screen.getByRole("link", { name: "Button" }).click();
    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate.mock.calls.at(0)?.at(0)).toBe(
      "ds:global.component.button",
    );
  });

  it("applies additional class names alongside the component classes", () => {
    render(
      <Chip
        className="extra"
        kind="component"
        label="Button"
        uri="ds:global.component.button"
      />,
    );
    const chip = screen.getByText("Button");
    expect(chip.className).toContain("ds chip");
    expect(chip.className).toContain("extra");
  });

  it("rejects an empty uri or label at the content boundary", () => {
    // Called as plain functions to exercise the asserts without React noise.
    expect(() => Chip({ uri: "", label: "Button", kind: "component" })).toThrow(
      /"uri" must be a non-empty string/,
    );
    expect(() =>
      Chip({ uri: "ds:global.component.button", label: "", kind: "component" }),
    ).toThrow(/"label" must be a non-empty string/);
  });
});
