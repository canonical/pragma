import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createRef, type MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuEntry, MenuItem } from "./types.js";

const items: MenuEntry[] = [
  { key: "cut", label: "Cut", url: "#cut" },
  { key: "copy", label: "Copy", url: "#copy" },
  { type: "separator", key: "before-zoom" },
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

  it("renders a Pragma Button trigger and composes its custom class", () => {
    const onClick = vi.fn();
    renderMenu({
      triggerProps: {
        className: "custom-trigger",
        importance: "secondary",
        onClick,
      },
    });
    const trigger = screen.getByRole("button", { name: "Actions" });

    expect(trigger).toHaveClass(
      "ds",
      "button",
      "trigger",
      "custom-trigger",
      "secondary",
    );
    fireEvent.click(trigger);
    expect(onClick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("composes triggerProps.ref onto the native button", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    renderMenu({ triggerProps: { ref: triggerRef } });
    const trigger = screen.getByRole("button", { name: "Actions" });

    expect(triggerRef.current).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
  });

  it("does not open when the consumer click handler prevents default", () => {
    renderMenu({
      triggerProps: {
        onClick: (event: MouseEvent<HTMLButtonElement>) =>
          event.preventDefault(),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps the native trigger when triggerProps is absent", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: "Actions" })).toHaveClass(
      "trigger",
    );
    expect(screen.getByRole("button", { name: "Actions" })).not.toHaveClass(
      "ds",
      "button",
    );
  });

  it("reports uncontrolled open changes", () => {
    const onOpenChange = vi.fn();
    renderMenu({ onOpenChange });
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it("supports controlled open state", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ContextualMenu
        trigger="Actions"
        items={items}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    rerender(
      <ContextualMenu
        trigger="Actions"
        items={items}
        open
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  describe("accessible menu labels", () => {
    it("uses a string label directly", () => {
      renderMenu({ label: "Action menu" });
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      expect(screen.getByRole("menu", { name: "Action menu" })).toHaveAttribute(
        "aria-label",
        "Action menu",
      );
    });

    it("falls back to the trigger when no label is supplied", () => {
      renderMenu();
      const trigger = screen.getByRole("button", { name: "Actions" });
      fireEvent.click(trigger);
      expect(screen.getByRole("menu", { name: "Actions" })).toHaveAttribute(
        "aria-labelledby",
        trigger.id,
      );
    });
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

  it("renders a custom item as a selectable menuitem", () => {
    const onSelect = vi.fn();
    const custom: MenuEntry[] = [
      {
        key: "custom",
        label: "Custom",
        displayItemsType: "custom",
        Component: () => <span data-testid="custom-render">Custom!</span>,
      },
    ];
    render(
      <ContextualMenu trigger="More" items={custom} onSelect={onSelect} />,
    );
    const item = screen.getByRole("menuitem", {
      hidden: true,
      name: "Custom!",
    });
    expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    expect(item).toHaveClass("contextual-menu-item");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: "custom" }),
    );
    expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
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

  it("stays open on Escape when closeOnEscape is false", () => {
    renderMenu({ closeOnEscape: false });
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
  });

  it("keeps menuitem focus on Escape when closeOnEscape is false", async () => {
    renderMenu({ closeOnEscape: false });
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const cut = screen.getByRole("menuitem", { name: "Cut" });
    await waitFor(() => expect(cut).toHaveFocus());
    fireEvent.keyDown(cut, { key: "Escape" });
    expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
    expect(cut).toHaveFocus();
    expect(cut).toHaveAttribute("data-highlighted", "true");
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

      vi.useFakeTimers();
      try {
        fireEvent.pointerLeave(anchor as HTMLElement);
        expect(screen.getByText("Sub one")).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(120));
        expect(screen.queryByText("Sub one")).not.toBeInTheDocument();
        expect(parent).toHaveAttribute("aria-expanded", "false");
        // Closed popup: no dangling aria-controls IDREF.
        expect(parent).not.toHaveAttribute("aria-controls");
      } finally {
        vi.useRealTimers();
      }
    });

    it("positions a keyboard-opened submenu and restores focus on ArrowLeft", async () => {
      const rect = {
        x: 100,
        y: 100,
        top: 100,
        right: 200,
        bottom: 132,
        left: 100,
        width: 100,
        height: 32,
        toJSON: () => ({}),
      } as DOMRect;
      const rectSpy = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockReturnValue(rect);

      try {
        const { menu, parent } = openSubmenuMenu();
        fireEvent.keyDown(menu, { key: "ArrowDown" });
        fireEvent.keyDown(menu, { key: "ArrowRight" });

        const submenu = screen.getByRole("menu", { name: "Parent" });
        const firstChild = within(submenu).getByRole("menuitem", {
          name: "Sub one",
        });
        await waitFor(() =>
          expect(submenu).toHaveAttribute("data-positioned", "true"),
        );
        await waitFor(() => expect(firstChild).toHaveFocus());

        fireEvent.keyDown(firstChild, { key: "ArrowLeft" });
        await waitFor(() => expect(parent).toHaveFocus());
        expect(screen.queryByRole("menu", { name: "Parent" })).toBeNull();
      } finally {
        rectSpy.mockRestore();
      }
    });

    it("places a keyboard-opened submenu toward inline-end, mirrored in RTL", async () => {
      const originalDir = document.documentElement.dir;
      const parentRect = {
        x: 200,
        y: 80,
        top: 80,
        right: 320,
        bottom: 112,
        left: 200,
        width: 120,
        height: 32,
        toJSON: () => ({}),
      } as DOMRect;
      const submenuRect = {
        x: 0,
        y: 0,
        top: 0,
        right: 160,
        bottom: 80,
        left: 0,
        width: 160,
        height: 80,
        toJSON: () => ({}),
      } as DOMRect;
      const rectSpy = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          return this.getAttribute("role") === "menu" &&
            this.classList.contains("submenu")
            ? submenuRect
            : parentRect;
        });

      try {
        const { menu } = openSubmenuMenu();
        fireEvent.keyDown(menu, { key: "ArrowDown" });
        fireEvent.keyDown(menu, { key: "ArrowRight" });
        const ltrSubmenu = await screen.findByRole("menu", { name: "Parent" });
        await waitFor(() =>
          expect(ltrSubmenu).toHaveAttribute("data-positioned", "true"),
        );
        expect(ltrSubmenu).toHaveClass("right");

        act(() => {
          document.documentElement.dir = "rtl";
        });
        fireEvent.keyDown(
          within(ltrSubmenu).getByRole("menuitem", { name: "Sub one" }),
          { key: "ArrowLeft" },
        );
        fireEvent.keyDown(menu, { key: "ArrowRight" });
        const rtlSubmenu = await screen.findByRole("menu", { name: "Parent" });
        await waitFor(() =>
          expect(rtlSubmenu).toHaveAttribute("data-positioned", "true"),
        );
        expect(rtlSubmenu).toHaveClass("left");
      } finally {
        document.documentElement.dir = originalDir;
        rectSpy.mockRestore();
      }
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

    it("opens the first submenu child without selecting the parent", () => {
      // A parent is a submenu trigger, not a choosable leaf: activating it must
      // open the submenu and never call onSelect (WAI-ARIA menu pattern).
      const onSelect = vi.fn();
      openMenu(onSelect);
      fireEvent.click(screen.getByRole("menuitem", { name: "Parent" }));
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getAllByRole("menu")[0]).toHaveAttribute(
        "aria-hidden",
        "false",
      );
      expect(screen.getByRole("menuitem", { name: "Sub" })).toHaveAttribute(
        "tabindex",
        "0",
      );
    });

    it("does not fire onSelect for a disabled item", () => {
      const onSelect = vi.fn();
      openMenu(onSelect);
      fireEvent.click(screen.getByRole("menuitem", { name: "Disabled" }));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("runs item onSelect before menu onSelect and closes once", () => {
      const calls: string[] = [];
      const onOpenChange = vi.fn();
      const selectable: MenuEntry[] = [
        {
          key: "leaf",
          label: "Leaf",
          "aria-label": "Select leaf",
          onSelect: () => calls.push("item"),
        },
      ];
      render(
        <ContextualMenu
          trigger="Actions"
          items={selectable}
          onSelect={() => calls.push("menu")}
          onOpenChange={onOpenChange}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Select leaf" }));

      expect(calls).toEqual(["item", "menu"]);
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it("does not invoke item callbacks for disabled items", () => {
      const itemOnSelect = vi.fn();
      const menuOnSelect = vi.fn();
      render(
        <ContextualMenu
          trigger="Actions"
          items={[
            {
              key: "disabled",
              label: "Disabled",
              disabled: true,
              onSelect: itemOnSelect,
            },
          ]}
          onSelect={menuOnSelect}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Disabled" }));
      expect(itemOnSelect).not.toHaveBeenCalled();
      expect(menuOnSelect).not.toHaveBeenCalled();
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

  describe("interactive panels", () => {
    const FilterPanel = () => (
      <form onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Filter instances" />
        <input type="checkbox" aria-label="Running" />
        <button type="submit">Apply</button>
      </form>
    );
    const panelItems: MenuEntry[] = [
      {
        key: "filter",
        label: "Filter",
        displayItemsType: "panel",
        Component: FilterPanel,
      },
    ];

    it("renders a non-selectable group, not a menuitem", () => {
      render(<ContextualMenu trigger="Actions" items={panelItems} />);
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const panel = screen.getByRole("group", { name: "Filter" });
      expect(panel).toHaveClass("contextual-menu-panel");
      expect(panel).toHaveAttribute("data-contextual-menu-panel");
      expect(panel).not.toHaveClass("contextual-menu-item");
      expect(
        screen.queryByRole("menuitem", { name: "Filter" }),
      ).not.toBeInTheDocument();
    });

    it("focuses the first panel control by default", async () => {
      render(<ContextualMenu trigger="Actions" items={panelItems} />);
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      await waitFor(() =>
        expect(
          screen.getByRole("textbox", { name: "Filter instances" }),
        ).toHaveFocus(),
      );
    });

    it("focuses the menu container when highlightFirstItem is false", async () => {
      render(
        <ContextualMenu
          trigger="Actions"
          items={panelItems}
          highlightFirstItem={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      await waitFor(() => expect(screen.getByRole("menu")).toHaveFocus());
      expect(
        screen.getByRole("textbox", { name: "Filter instances" }),
      ).not.toHaveFocus();
    });

    it("lets controls handle clicks and keys without selecting or closing", () => {
      const onSelect = vi.fn();
      render(
        <ContextualMenu
          trigger="Actions"
          items={panelItems}
          onSelect={onSelect}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const input = screen.getByRole("textbox", { name: "Filter instances" });
      fireEvent.click(input);
      fireEvent.keyDown(input, { key: "a" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
      expect(input.closest(".contextual-menu-panel")).not.toHaveClass(
        "contextual-menu-item",
      );
      expect(input.closest("[role='group']")).toHaveAttribute(
        "aria-label",
        "Filter",
      );
    });

    it("keeps Tab inside the panel as native form navigation", () => {
      render(
        <ContextualMenu
          trigger="Actions"
          items={panelItems}
          highlightFirstItem={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const search = screen.getByRole("textbox", { name: "Filter instances" });
      const running = screen.getByRole("checkbox", { name: "Running" });
      const apply = screen.getByRole("button", { name: "Apply" });

      search.focus();
      expect(fireEvent.keyDown(search, { key: "Tab", bubbles: true })).toBe(
        true,
      );
      running.focus();
      expect(fireEvent.keyDown(running, { key: "Tab", bubbles: true })).toBe(
        true,
      );
      apply.focus();

      expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
      expect(apply).toHaveFocus();
    });

    it("closes on Escape and returns focus to the trigger", () => {
      const onOpenChange = vi.fn();
      render(
        <ContextualMenu
          trigger="Actions"
          items={panelItems}
          onOpenChange={onOpenChange}
        />,
      );
      const trigger = screen.getByRole("button", { name: "Actions" });
      fireEvent.click(trigger);
      const input = screen.getByRole("textbox", { name: "Filter instances" });
      input.focus();
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.getByRole("menu", { hidden: true })).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(trigger).toHaveFocus();
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it("keeps a panel open on Escape when closeOnEscape is false", () => {
      render(
        <ContextualMenu
          trigger="Actions"
          items={panelItems}
          closeOnEscape={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const input = screen.getByRole("textbox", { name: "Filter instances" });
      input.focus();
      fireEvent.keyDown(input, { key: "Escape" });
      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
      expect(input).toHaveFocus();
    });
  });

  describe("portalled submenu ownership", () => {
    const nestedItems: MenuEntry[] = [
      {
        key: "parent",
        label: "Parent",
        items: [{ key: "child", label: "Child" }],
      },
    ];

    it("opens the first enabled child when the parent is keyboard-activated", () => {
      render(<ContextualMenu trigger="Actions" items={nestedItems} />);
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const parent = screen.getByRole("menuitem", { name: "Parent" });
      fireEvent.keyDown(parent, { key: "Enter" });
      expect(screen.getByRole("menuitem", { name: "Child" })).toHaveAttribute(
        "tabindex",
        "0",
      );
    });

    it("closes a nested panel from its input on ArrowLeft", async () => {
      const interactiveNestedItems: MenuEntry[] = [
        {
          key: "parent",
          label: "Parent",
          items: [
            {
              key: "filter",
              label: "Filter",
              displayItemsType: "panel",
              Component: () => <input aria-label="Nested filter" />,
            },
          ],
        },
      ];
      render(
        <ContextualMenu trigger="Actions" items={interactiveNestedItems} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const parent = screen.getByRole("menuitem", { name: "Parent" });
      fireEvent.keyDown(parent, { key: "Enter" });
      const input = screen.getByRole("textbox", { name: "Nested filter" });
      input.focus();

      fireEvent.keyDown(input, { key: "ArrowLeft" });
      await waitFor(() => expect(parent).toHaveFocus());
      expect(screen.queryByRole("menu", { name: "Parent" })).toBeNull();
    });

    it("keeps the submenu open while the pointer crosses into its portal", () => {
      render(<ContextualMenu trigger="Actions" items={nestedItems} />);
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const anchor = screen
        .getByRole("menuitem", { name: "Parent" })
        .closest(".submenu-anchor") as HTMLElement;
      fireEvent.pointerEnter(anchor);
      const submenu = screen.getByRole("menu", { name: "Parent" });

      vi.useFakeTimers();
      try {
        fireEvent.pointerLeave(anchor);
        fireEvent.pointerEnter(submenu);
        act(() => vi.advanceTimersByTime(120));
        expect(submenu).toBeInTheDocument();

        fireEvent.pointerLeave(submenu);
        act(() => vi.advanceTimersByTime(120));
        expect(screen.queryByRole("menu", { name: "Parent" })).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("treats nested surfaces as inside and closes once on a genuine outside pointer", () => {
      const onOpenChange = vi.fn();
      render(
        <ContextualMenu
          trigger="Actions"
          items={nestedItems}
          onOpenChange={onOpenChange}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      const anchor = screen
        .getByRole("menuitem", { name: "Parent" })
        .closest(".submenu-anchor") as HTMLElement;
      fireEvent.pointerEnter(anchor);
      const child = screen.getByRole("menuitem", { name: "Child" });

      fireEvent.pointerDown(child);
      expect(screen.getByRole("button", { name: "Actions" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      fireEvent.pointerDown(document.body);
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it("keeps the menu open on outside pointer-down when opted out", () => {
      render(
        <ContextualMenu
          trigger="Actions"
          items={nestedItems}
          closeOnOutsideClick={false}
        />,
      );
      const trigger = screen.getByRole("button", { name: "Actions" });
      fireEvent.click(trigger);
      fireEvent.pointerDown(document.body);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toHaveAttribute("aria-hidden", "false");
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
        { type: "separator", key: "leading" },
        { key: "alpha", label: "Alpha", url: "#alpha" },
        { key: "beta", label: "Beta", url: "#beta" },
        { type: "separator", key: "trailing" },
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
        { type: "separator", key: "leading" },
        { key: "alpha", label: "Alpha", url: "#alpha" },
        { key: "beta", label: "Beta", url: "#beta" },
        { type: "separator", key: "trailing" },
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

    it("renders and skips a separator INSIDE a submenu", () => {
      // A submenu's entries go through the same preparation as the root's, so
      // a separator nested one level down is a divider there too — and the
      // navigation tree steps over it within the submenu's own sibling list.
      const nested: MenuEntry[] = [
        {
          key: "parent",
          label: "Parent",
          items: [
            { key: "sub1", label: "Sub one", url: "#sub1" },
            { type: "separator", key: "sub-divider" },
            { key: "sub2", label: "Sub two", url: "#sub2" },
          ],
        },
      ];
      render(<ContextualMenu trigger="Actions" items={nested} />);
      const menu = openMenu();
      // ArrowRight descends into the submenu, landing on its first entry.
      fireEvent.keyDown(menu, { key: "ArrowRight" });
      const submenu = screen.getByText("Sub one").closest('[role="menu"]');
      expect(submenu).not.toBeNull();
      // The nested separator is a divider, not a menuitem: the submenu holds
      // one <hr> and exactly two interactive entries.
      const inSubmenu = within(submenu as HTMLElement);
      expect(inSubmenu.getAllByRole("separator")).toHaveLength(1);
      expect(inSubmenu.getAllByRole("menuitem")).toHaveLength(2);
      expect(rovingTarget()).toHaveTextContent("Sub one");
      // ArrowDown steps over the nested separator onto the entry beyond it.
      fireEvent.keyDown(submenu as HTMLElement, { key: "ArrowDown" });
      expect(rovingTarget()).toHaveTextContent("Sub two");
      fireEvent.keyDown(submenu as HTMLElement, { key: "ArrowUp" });
      expect(rovingTarget()).toHaveTextContent("Sub one");
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
