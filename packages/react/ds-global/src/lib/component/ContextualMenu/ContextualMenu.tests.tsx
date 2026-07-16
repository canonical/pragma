import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuEntry, MenuItem } from "./types.js";

const items: MenuEntry[] = [
  { key: "cut", label: "Cut", url: "#cut" },
  { key: "copy", label: "Copy", url: "#copy" },
  { type: "separator" },
  { key: "zoom", label: "Zoom", url: "#zoom" },
];

const renderMenu = (props = {}) =>
  render(<ContextualMenu trigger="Actions" items={items} {...props} />);

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

  it("renders items and separators", () => {
    renderMenu();
    expect(screen.getByText("Cut")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Zoom")).toBeInTheDocument();
    // The separator is a divider with the implicit `role="separator"`, not a
    // menuitem — it must never enter the menu's interactive item list.
    expect(screen.getAllByRole("separator", { hidden: true })).toHaveLength(1);
    expect(screen.getAllByRole("menuitem", { hidden: true })).toHaveLength(3);
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
    const withSlot: MenuEntry[] = [
      { key: "save", label: "Save", url: "#save", slot: "⌘S" },
    ];
    render(<ContextualMenu trigger="File" items={withSlot} />);
    expect(screen.getByText("⌘S")).toHaveClass("slot");
  });

  it("renders a custom item component", () => {
    const custom: MenuEntry[] = [
      {
        key: "custom",
        label: "Custom",
        displayItemsType: "custom",
        Component: () => <span data-testid="custom-render">Custom!</span>,
      },
    ];
    render(<ContextualMenu trigger="More" items={custom} />);
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
    const submenuItems: MenuEntry[] = [
      { key: "first", label: "First", url: "#first" },
      {
        key: "parent",
        label: "Parent",
        items: [
          { key: "sub1", label: "Sub one", url: "#sub1" },
          { key: "sub2", label: "Sub two", url: "#sub2" },
        ],
      },
    ];

    const openSubmenuMenu = () => {
      render(<ContextualMenu trigger="Actions" items={submenuItems} />);
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
    const parentItems: MenuEntry[] = [
      { key: "leaf", label: "Leaf", url: "#leaf" },
      { key: "off", label: "Disabled", url: "#off", disabled: true },
      {
        key: "parent",
        label: "Parent",
        items: [{ key: "sub", label: "Sub", url: "#sub" }],
      },
    ];

    const openMenu = (onSelect?: (item: MenuItem) => void) => {
      render(
        <ContextualMenu
          trigger="Actions"
          items={parentItems}
          onSelect={onSelect}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    };

    it("closes the whole menu when a nested submenu leaf is selected", () => {
      // Regression: the submenu gated its visibility on hover/keyboard state
      // alone, so a mouse-selected nested leaf closed the root surface while
      // the still-hovered, portalled submenu stayed mounted and visible.
      const onSelect = vi.fn();
      openMenu(onSelect);
      const anchor = screen
        .getByRole("menuitem", { name: "Parent" })
        .closest(".submenu-anchor") as HTMLElement;
      fireEvent.pointerEnter(anchor);
      fireEvent.click(screen.getByRole("menuitem", { name: "Sub" }));
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ key: "sub" }),
      );
      expect(screen.getByRole("button", { name: "Actions" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.queryByText("Sub")).not.toBeInTheDocument();
      // Reopening must not resurrect the submenu from stale hover state.
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      expect(screen.queryByText("Sub")).not.toBeInTheDocument();
    });

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

    it("suppresses the browser default for Space on every item kind", () => {
      // On a focusable div a bare Space scrolls the page, so the "no-op" on a
      // disabled item or submenu parent must still preventDefault.
      // fireEvent returns false when the default action was prevented.
      openMenu();
      for (const name of ["Disabled", "Parent"]) {
        const item = screen.getByRole("menuitem", { name });
        expect(fireEvent.keyDown(item, { key: " " })).toBe(false);
        expect(fireEvent.keyDown(item, { key: "Enter" })).toBe(false);
      }
      // The leaf last: Space activates it, which closes the menu.
      const leaf = screen.getByRole("menuitem", { name: "Leaf" });
      expect(fireEvent.keyDown(leaf, { key: " " })).toBe(false);
    });
  });

  describe("separator keyboard behaviour", () => {
    // The separator enters the navigation tree as a disabled, label-less node,
    // so every keyboard path must skip it with no separator-specific logic.
    const rovingTarget = () =>
      screen
        .getAllByRole("menuitem")
        .find((el) => el.getAttribute("tabindex") === "0");

    const openMenu = () => {
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      return screen.getByRole("menu");
    };

    it("arrow keys skip the separator in both directions", () => {
      renderMenu();
      const menu = openMenu();
      // Open highlights the first item (Cut); ArrowDown moves to Copy.
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(rovingTarget()).toHaveTextContent("Copy");
      // The next entry is the separator — ArrowDown lands on Zoom beyond it.
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(rovingTarget()).toHaveTextContent("Zoom");
      // And back up over it.
      fireEvent.keyDown(menu, { key: "ArrowUp" });
      expect(rovingTarget()).toHaveTextContent("Copy");
    });

    it("type-ahead matches an item beyond the separator", () => {
      renderMenu();
      const menu = openMenu();
      fireEvent.keyDown(menu, { key: "z" });
      expect(rovingTarget()).toHaveTextContent("Zoom");
    });

    it("skips leading and trailing separators on open, Home and End", () => {
      const edged: MenuEntry[] = [
        { type: "separator" },
        { key: "alpha", label: "Alpha", url: "#alpha" },
        { key: "beta", label: "Beta", url: "#beta" },
        { type: "separator" },
      ];
      render(<ContextualMenu trigger="Actions" items={edged} wrap={false} />);
      const menu = openMenu();
      // Open lands past the leading separator, on the first real item.
      expect(rovingTarget()).toHaveTextContent("Alpha");
      // End lands before the trailing separator, on the last real item...
      fireEvent.keyDown(menu, { key: "End" });
      expect(rovingTarget()).toHaveTextContent("Beta");
      // ...and with wrapping off, ArrowDown from there has nowhere to go.
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(rovingTarget()).toHaveTextContent("Beta");
      fireEvent.keyDown(menu, { key: "Home" });
      expect(rovingTarget()).toHaveTextContent("Alpha");
      // PageDown's raw landing clamps onto the trailing separator; the jump
      // must fall back to the nearest enabled item, not silently no-op.
      fireEvent.keyDown(menu, { key: "PageDown" });
      expect(rovingTarget()).toHaveTextContent("Beta");
    });

    it("wraps by default, looping past leading and trailing separators", () => {
      const edged: MenuEntry[] = [
        { type: "separator" },
        { key: "alpha", label: "Alpha", url: "#alpha" },
        { key: "beta", label: "Beta", url: "#beta" },
        { type: "separator" },
      ];
      render(<ContextualMenu trigger="Actions" items={edged} />);
      const menu = openMenu();
      fireEvent.keyDown(menu, { key: "End" });
      expect(rovingTarget()).toHaveTextContent("Beta");
      // ArrowDown from the last item loops to the first, stepping over BOTH
      // the trailing and the leading separator.
      fireEvent.keyDown(menu, { key: "ArrowDown" });
      expect(rovingTarget()).toHaveTextContent("Alpha");
      fireEvent.keyDown(menu, { key: "ArrowUp" });
      expect(rovingTarget()).toHaveTextContent("Beta");
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
