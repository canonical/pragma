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

  it("returns focus to the trigger on Escape", () => {
    // Regression: the disclosure's focus-return ref sat on the non-focusable
    // wrapper div, so `focus()` was a no-op and focus fell to <body>.
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Actions" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the trigger when an item is selected", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Actions" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Copy"));
    expect(trigger).toHaveFocus();
  });

  describe("submenu ARIA state", () => {
    const submenuGroups: MenuItem[] = [
      {
        key: "group",
        items: [
          { key: "first", label: "First", url: "#first" },
          {
            key: "parent",
            label: "Parent",
            items: [
              { key: "sub1", label: "Sub one", url: "#sub1" },
              { key: "sub2", label: "Sub two", url: "#sub2" },
            ],
          },
        ],
      },
    ];

    const openSubmenuMenu = () => {
      render(<ContextualMenu trigger="Actions" groups={submenuGroups} />);
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      return {
        menu: screen.getByRole("menu"),
        parent: screen.getByRole("menuitem", { name: "Parent" }),
      };
    };

    it("reflects the real popup state on aria-expanded (keyboard path)", () => {
      // Regression: aria-expanded was computed from the highlight branch alone,
      // reporting true for a merely-highlighted parent whose popup is not even
      // mounted (WCAG 4.1.2 name/role/value).
      const { menu, parent } = openSubmenuMenu();
      expect(parent).toHaveAttribute("aria-haspopup", "menu");
      expect(parent).toHaveAttribute("aria-expanded", "false");

      // ArrowDown highlights the parent itself — the popup stays unmounted, so
      // it must still report closed.
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(screen.queryByText("Sub one")).not.toBeInTheDocument();
      expect(parent).toHaveAttribute("aria-expanded", "false");

      // ArrowRight descends into the submenu — now it is genuinely open, and
      // the parent points at the popup it controls.
      fireEvent.keyDown(menu, { key: "ArrowRight" });
      const submenu = screen.getByText("Sub one").closest('[role="menu"]');
      expect(submenu).not.toBeNull();
      expect(parent).toHaveAttribute("aria-expanded", "true");
      expect(parent).toHaveAttribute("aria-controls", submenu?.id);
    });

    it("reflects a hover-opened popup on aria-expanded", () => {
      // Regression: hover-open is local state invisible to the navigation
      // tree, so a hover-opened submenu reported aria-expanded="false".
      const { parent } = openSubmenuMenu();
      const anchor = parent.closest(".submenu-anchor");
      expect(anchor).not.toBeNull();
      expect(parent).toHaveAttribute("aria-expanded", "false");

      fireEvent.pointerEnter(anchor as HTMLElement);
      expect(screen.getByText("Sub one")).toBeInTheDocument();
      expect(parent).toHaveAttribute("aria-expanded", "true");

      fireEvent.pointerLeave(anchor as HTMLElement);
      expect(screen.queryByText("Sub one")).not.toBeInTheDocument();
      expect(parent).toHaveAttribute("aria-expanded", "false");
      // Closed popup: no dangling aria-controls IDREF.
      expect(parent).not.toHaveAttribute("aria-controls");
    });
  });

  describe("selection semantics", () => {
    const parentGroups: MenuItem[] = [
      {
        key: "group",
        items: [
          { key: "leaf", label: "Leaf", url: "#leaf" },
          { key: "off", label: "Disabled", url: "#off", disabled: true },
          {
            key: "parent",
            label: "Parent",
            items: [{ key: "sub", label: "Sub", url: "#sub" }],
          },
        ],
      },
    ];

    const openMenu = (onSelect?: (item: MenuItem) => void) => {
      render(
        <ContextualMenu
          trigger="Actions"
          groups={parentGroups}
          onSelect={onSelect}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    };

    it("does not fire onSelect for a submenu parent (opens its submenu instead)", () => {
      // A parent is a submenu trigger, not a choosable leaf: activating it must
      // open the submenu and never call onSelect (WAI-ARIA menu pattern).
      const onSelect = vi.fn();
      openMenu(onSelect);
      fireEvent.click(screen.getByRole("menuitem", { name: "Parent" }));
      expect(onSelect).not.toHaveBeenCalled();
      // The menu stays open (a parent click does not dismiss like a leaf).
      expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
    });

    it("does not fire onSelect for a disabled item", () => {
      const onSelect = vi.fn();
      openMenu(onSelect);
      fireEvent.click(screen.getByRole("menuitem", { name: "Disabled" }));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("marks a disabled item aria-disabled", () => {
      openMenu();
      expect(
        screen.getByRole("menuitem", { name: "Disabled" }),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("activates a leaf on Space, firing onSelect", () => {
      const onSelect = vi.fn();
      openMenu(onSelect);
      fireEvent.keyDown(screen.getByRole("menuitem", { name: "Leaf" }), {
        key: " ",
      });
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ key: "leaf" }),
      );
    });

    it("activates a leaf on Enter, firing onSelect", () => {
      const onSelect = vi.fn();
      openMenu(onSelect);
      fireEvent.keyDown(screen.getByRole("menuitem", { name: "Leaf" }), {
        key: "Enter",
      });
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ key: "leaf" }),
      );
    });

    it("does not fire onSelect on Space/Enter over a submenu parent", () => {
      const onSelect = vi.fn();
      openMenu(onSelect);
      const parent = screen.getByRole("menuitem", { name: "Parent" });
      fireEvent.keyDown(parent, { key: " " });
      fireEvent.keyDown(parent, { key: "Enter" });
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  it("marks the menu vertical with aria-orientation", () => {
    renderMenu();
    // ARIA defaults `menu` to vertical, but declaring it is explicit and
    // documents the Up/Down arrow model.
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
  });
});
