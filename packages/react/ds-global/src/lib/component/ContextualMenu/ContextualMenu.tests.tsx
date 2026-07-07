import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuItem } from "./types.js";

const groups: MenuItem[] = [
  {
    key: "group-a",
    label: "Edit",
    items: [
      { key: "cut", label: "Cut", url: "#cut" },
      { key: "copy", label: "Copy", url: "#copy" },
    ],
  },
  {
    key: "group-b",
    label: "View",
    items: [{ key: "zoom", label: "Zoom", url: "#zoom" }],
  },
];

const renderMenu = (props = {}) =>
  render(<ContextualMenu trigger="Actions" groups={groups} {...props} />);

describe("ContextualMenu", () => {
  it("renders a trigger with menu semantics", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the menu closed by default", () => {
    renderMenu();
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("opens the menu on trigger click", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("button", { name: "Actions" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("renders groups and their items", () => {
    renderMenu();
    expect(screen.getAllByRole("group", { hidden: true })).toHaveLength(2);
    expect(screen.getByText("Cut")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Zoom")).toBeInTheDocument();
  });

  it("calls onSelect and closes when an item is activated", () => {
    const onSelect = vi.fn();
    renderMenu({ onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.click(screen.getByText("Copy"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: "copy" }),
    );
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("renders a right-aligned slot on an item", () => {
    const withSlot: MenuItem[] = [
      {
        key: "g",
        items: [{ key: "save", label: "Save", url: "#save", slot: "⌘S" }],
      },
    ];
    render(<ContextualMenu trigger="File" groups={withSlot} />);
    expect(screen.getByText("⌘S")).toHaveClass("slot");
  });

  it("renders a custom item component", () => {
    const custom: MenuItem[] = [
      {
        key: "g",
        items: [
          {
            key: "custom",
            label: "Custom",
            displayItemsType: "custom",
            Component: () => <span data-testid="custom-render">Custom!</span>,
          },
        ],
      },
    ];
    render(<ContextualMenu trigger="More" groups={custom} />);
    expect(screen.getByTestId("custom-render")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
