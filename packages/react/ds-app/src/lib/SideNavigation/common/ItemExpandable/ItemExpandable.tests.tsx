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

  it("re-opens when the defaultExpanded seed flips true on a mounted instance", () => {
    // The seed is live: routing to a nested sub-item flips it true, and the
    // disclosure must re-open (NavTree derives the seed from whether this
    // node's branch is the selected one).
    const { rerender, container } = render(
      <ItemExpandable heading="Hardware">
        <li>Machines</li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details).not.toHaveAttribute("open");

    rerender(<ItemExpandable heading="Hardware" defaultExpanded />);
    expect(details).toHaveAttribute("open");
  });

  it("respects a manual collapse: the disclosure never re-opens while the seed is unchanged", () => {
    const { rerender, container } = render(
      <ItemExpandable heading="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = container.querySelector("summary") as HTMLElement;

    // User collapses manually…
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");

    // …and it stays collapsed while the seed is unchanged (the effect only
    // re-opens when the seed FLIPS true; an unchanged true does nothing).
    rerender(<ItemExpandable heading="Hardware" defaultExpanded />);
    expect(details).not.toHaveAttribute("open");
  });

  it("does not force-close when the seed flips back to false (never auto-closes)", () => {
    const { rerender, container } = render(
      <ItemExpandable heading="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details).toHaveAttribute("open");

    rerender(<ItemExpandable heading="Hardware" />);
    expect(details).toHaveAttribute("open");
  });

  it("collapses when a child row is activated (collapseOnChildClick)", () => {
    const { container } = render(
      <ItemExpandable heading="User" defaultExpanded collapseOnChildClick>
        <li>
          <a href="/profile">Profile</a>
        </li>
        <li>
          <button type="button">Log out</button>
        </li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(details).not.toHaveAttribute("open");
  });

  it("does not collapse on child-row clicks without collapseOnChildClick", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware" defaultExpanded>
        <li>
          <a href="/machines">Machines</a>
        </li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    fireEvent.click(screen.getByRole("link", { name: "Machines" }));
    expect(details).toHaveAttribute("open");
  });

  it("collapses only for row activations, not clicks elsewhere in the panel", () => {
    const { container } = render(
      <ItemExpandable heading="User" defaultExpanded collapseOnChildClick>
        <li>
          <span>Plain label</span>
        </li>
      </ItemExpandable>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    fireEvent.click(screen.getByText("Plain label"));
    expect(details).toHaveAttribute("open");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ItemExpandable heading="Hardware" className="custom-class" />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation-item-expandable");
    expect(el?.className).toContain("custom-class");
  });

  it("gates the caret's rotation transition behind prefers-reduced-motion (the 24.04 spec §6)", () => {
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

  it("wires the children panel to the summary with unique anchor names (CSS anchor positioning)", () => {
    const { container } = render(
      <>
        <ItemExpandable heading="Hardware">
          <li>Machines</li>
        </ItemExpandable>
        <ItemExpandable heading="Software">
          <li>Packages</li>
        </ItemExpandable>
      </>,
    );
    const summaries = container.querySelectorAll("summary");
    const panels = container.querySelectorAll(".children");

    // Each summary anchors, each panel is positioned against its own
    // summary's anchor — distinct names, same --sidenav-expandable- prefix.
    const names = Array.from(summaries).map((summary) =>
      (summary as HTMLElement).style.getPropertyValue("anchor-name"),
    );
    const targets = Array.from(panels).map((panel) =>
      (panel as HTMLElement).style.getPropertyValue("position-anchor"),
    );

    expect(names).toHaveLength(2);
    expect(targets).toEqual(names);
    names.forEach((name) => {
      expect(name).toMatch(/^--sidenav-expandable-/);
      // Ident-safe: no colons or other characters that break a dashed-ident.
      expect(name).toMatch(/^--[a-zA-Z0-9-]+$/);
    });
    expect(new Set(names).size).toBe(2);
  });
});
