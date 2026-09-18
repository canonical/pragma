import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextSwitcher from "./ContextSwitcher.js";
import type { ContextSwitcherItem } from "./types.js";

const contexts: ContextSwitcherItem[] = [
  { key: "acme", name: "Acme Corp" },
  { key: "globex", name: "Globex", description: "Secondary account" },
];

/** Opens the menu (portaled to document.body, so its content leaves the aria-hidden subtree). */
const open = (): void => {
  fireEvent.click(screen.getByRole("button", { name: /Acme Corp/ }));
};

describe("ContextSwitcher", () => {
  it("shows the current context's name in the trigger, with menu-button semantics", () => {
    render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    const trigger = screen.getByRole("button", { name: /Acme Corp/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("lists every context, including description, once open", () => {
    render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open();
    expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Secondary account")).toBeInTheDocument();
  });

  it("renders each context as a menuitem", () => {
    render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open();
    expect(screen.getAllByRole("menuitem", { hidden: true })).toHaveLength(2);
  });

  it("calls onContextChange and closes when a context is selected", () => {
    const onContextChange = vi.fn();
    render(
      <ContextSwitcher
        currentContext={contexts[0]}
        contexts={contexts}
        onContextChange={onContextChange}
      />,
    );
    open();
    // The menuitem's accessible name includes its description text (both
    // are content of the same role="menuitem" element), so match on the
    // item's own identifying text rather than an exact accessible name.
    fireEvent.click(
      screen.getByText("Globex").closest('[role="menuitem"]') as HTMLElement,
    );
    expect(onContextChange).toHaveBeenCalledWith(contexts[1]);
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("marks the current context item for styling", () => {
    render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open();
    expect(
      screen.getByText("Acme Corp", { selector: ".name" }).closest(".content"),
    ).toHaveClass("current");
    expect(
      screen.getByText("Globex", { selector: ".name" }).closest(".content"),
    ).not.toHaveClass("current");
  });

  it("renders a create-context action and calls onCreateContext", () => {
    const onCreateContext = vi.fn();
    render(
      <ContextSwitcher
        currentContext={contexts[0]}
        contexts={contexts}
        onCreateContext={onCreateContext}
      />,
    );
    open();
    fireEvent.click(
      screen
        .getByText("Create context")
        .closest('[role="menuitem"]') as HTMLElement,
    );
    expect(onCreateContext).toHaveBeenCalledOnce();
  });

  it("renders the create-context label as a rich node, not just a plain string", () => {
    render(
      <ContextSwitcher
        currentContext={contexts[0]}
        contexts={contexts}
        onCreateContext={vi.fn()}
        createContextLabel={<strong>New workspace</strong>}
      />,
    );
    open();
    const label = screen.getByText("New workspace");
    expect(label.tagName).toBe("STRONG");
  });

  it("omits the create-context action when onCreateContext is not given", () => {
    render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open();
    expect(screen.queryByText("Create context")).not.toBeInTheDocument();
  });

  it("renders a badge when a context has one", () => {
    const withBadge: ContextSwitcherItem[] = [
      ...contexts,
      { key: "beta", name: "Beta", badge: <span>2</span> },
    ];
    render(
      <ContextSwitcher currentContext={contexts[0]} contexts={withBadge} />,
    );
    open();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders no caption by default", () => {
    const { container } = render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    expect(
      container.querySelector(".ds.side-navigation-group-header"),
    ).not.toBeInTheDocument();
  });

  it("renders the title as a GroupHeader caption above the trigger", () => {
    const { container } = render(
      <ContextSwitcher
        title="Context"
        currentContext={contexts[0]}
        contexts={contexts}
      />,
    );
    const caption = screen.getByText("Context");
    expect(caption).toHaveClass("ds", "side-navigation-group-header");
    // A sibling of ContextualMenu's own wrapper, not nested inside it — a
    // real Fragment child.
    expect(caption).toBe(container.firstElementChild);
    expect(caption.nextElementSibling).toHaveClass("ds", "contextual-menu");
  });

  it("navigates contexts with arrow keys and selects with Enter", () => {
    const onContextChange = vi.fn();
    render(
      <ContextSwitcher
        currentContext={contexts[0]}
        contexts={contexts}
        onContextChange={onContextChange}
      />,
    );
    open();
    // The roving tab stop, not necessarily real DOM focus — jsdom doesn't
    // run the requestAnimationFrame-deferred focus-into-menu effect
    // synchronously, but the keyboard handler is on the element regardless
    // of which one the browser has actually focused.
    const rovingItem = document.querySelector(
      '[role="menuitem"][tabindex="0"]',
    ) as HTMLElement;
    fireEvent.keyDown(rovingItem, { key: "ArrowDown" });
    const nextRovingItem = document.querySelector(
      '[role="menuitem"][tabindex="0"]',
    ) as HTMLElement;
    fireEvent.keyDown(nextRovingItem, { key: "Enter" });
    expect(onContextChange).toHaveBeenCalledWith(contexts[1]);
  });
});
