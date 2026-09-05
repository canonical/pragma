import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextSwitcher from "./ContextSwitcher.js";
import type { ContextSwitcherItem } from "./types.js";

const contexts: ContextSwitcherItem[] = [
  { key: "acme", name: "Acme Corp" },
  { key: "globex", name: "Globex", description: "Secondary account" },
];

/** Opens the popover so its content leaves the aria-hidden subtree. */
const open = (container: HTMLElement): void => {
  const summary = container.querySelector("summary") as HTMLElement;
  fireEvent.click(summary);
};

describe("ContextSwitcher", () => {
  it("shows the current context's name in the trigger", () => {
    const { container } = render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    const summary = container.querySelector("summary") as HTMLElement;
    // Content (the context list) is always in the DOM, only aria-hidden when
    // closed — scope to the trigger since the current context's name also
    // appears, unhidden to getByText, in its own list entry below.
    expect(within(summary).getByText("Acme Corp")).toBeInTheDocument();
  });

  it("lists every context, including description, once open", () => {
    const { container } = render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open(container);
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Secondary account")).toBeInTheDocument();
  });

  it("calls onContextChange when a context is selected", () => {
    const onContextChange = vi.fn();
    const { container } = render(
      <ContextSwitcher
        currentContext={contexts[0]}
        contexts={contexts}
        onContextChange={onContextChange}
      />,
    );
    open(container);
    // The list item's accessible name includes its description text (both
    // are content of the same <button>), so match on the item's own
    // identifying text rather than an exact accessible name.
    fireEvent.click(
      screen.getByText("Globex").closest("button") as HTMLElement,
    );
    expect(onContextChange).toHaveBeenCalledWith(contexts[1]);
  });

  it("marks the current context item for styling", () => {
    const { container } = render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open(container);
    expect(
      screen
        .getByText("Acme Corp", { selector: ".name" })
        .closest("button") as HTMLElement,
    ).toHaveAttribute("data-current");
    expect(
      screen.getByText("Globex").closest("button") as HTMLElement,
    ).not.toHaveAttribute("data-current");
  });

  it("renders a create-context action and calls onCreateContext", () => {
    const onCreateContext = vi.fn();
    const { container } = render(
      <ContextSwitcher
        currentContext={contexts[0]}
        contexts={contexts}
        onCreateContext={onCreateContext}
      />,
    );
    open(container);
    fireEvent.click(screen.getByRole("button", { name: "Create context" }));
    expect(onCreateContext).toHaveBeenCalledOnce();
  });

  it("omits the create-context action when onCreateContext is not given", () => {
    const { container } = render(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    open(container);
    expect(
      screen.queryByRole("button", { name: "Create context" }),
    ).not.toBeInTheDocument();
  });

  it("renders a badge when a context has one", () => {
    const withBadge: ContextSwitcherItem[] = [
      ...contexts,
      { key: "beta", name: "Beta", badge: <span>2</span> },
    ];
    const { container } = render(
      <ContextSwitcher currentContext={contexts[0]} contexts={withBadge} />,
    );
    open(container);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
