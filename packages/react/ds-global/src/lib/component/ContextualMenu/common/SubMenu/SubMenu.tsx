import type { _Item } from "@canonical/ds-types";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  isMenuSeparator,
  MENU_PLACEMENT,
  useWindowFitment,
} from "../../../../hooks/index.js";
import type { MenuEntry, MenuItem } from "../../types.js";
import Item from "../Item/index.js";
import { useMenuContext } from "../MenuContext.js";

/**
 * One node in a (possibly nested) contextual menu. A separator renders as a
 * plain divider (no item props — it is not interactive, and the navigation
 * tree never highlights it); a leaf renders a plain item; a submenu parent
 * renders the item plus a positioned nested popup for its children (see
 * {@link SubMenuParent}). The hook that positions the popup runs ONLY for
 * submenu parents — leaves render a bare item — so a menu of leaves spins up
 * no positioning machinery.
 */
const SubMenu = ({ item }: { item: _Item<MenuEntry> }): ReactElement => {
  const { getItemProps, onSelectItem } = useMenuContext();

  if (isMenuSeparator(item)) {
    // <hr> carries the implicit `role="separator"` WAI-ARIA menus expect.
    return <hr className="separator" />;
  }

  if (item.items?.length) {
    return <SubMenuParent item={item} />;
  }

  return (
    <Item
      item={item}
      itemProps={getItemProps(item)}
      onSelect={() => onSelectItem(item)}
    />
  );
};

/**
 * A submenu parent: the item plus its nested `role="menu"` popup. All nodes
 * share the ONE menu state from {@link useMenuContext}; this component only
 * decides the submenu's visibility and position. The submenu is shown when the
 * keyboard path descends through this parent
 * (`getNodeStatus(item).inHighlightedBranch`) or the parent is hovered, and is
 * positioned by its own {@link useWindowFitment} anchored to the parent item —
 * opening to the reading-direction leading edge, top-aligned, flipping side and
 * alignment as space runs out.
 */
const SubMenuParent = ({ item }: { item: _Item<MenuItem> }): ReactElement => {
  const { getItemProps, getMenuProps, getNodeStatus, onSelectItem } =
    useMenuContext();

  const children = item.items ?? [];
  const status = getNodeStatus(item);
  // The submenu is keyboard-open when the highlight is in a DESCENDANT of this
  // parent — not when the parent itself is the highlighted item. `inHighlighted
  // Branch` is true in both cases, so subtract `highlighted`: otherwise ArrowLeft
  // (which moves the highlight back onto the parent) would leave the submenu open.
  const keyboardOpen = status.inHighlightedBranch && !status.highlighted;
  const [hovered, setHovered] = useState(false);
  const open = keyboardOpen || hovered;

  // MENU_PLACEMENT is a stable module constant and logical, so the hook mirrors
  // it in RTL from this item's own writing direction — no per-submenu dir read.
  const { targetRef, popupRef, popupPositionStyle, bestPosition } =
    useWindowFitment({ preferredDirections: MENU_PLACEMENT, autoFit: true });

  // A stable, instance-unique id for the submenu surface so the parent item
  // can reference the popup it controls (item keys are only unique within one
  // menu, so useId rather than the item id).
  const submenuId = useId();

  // The item carries both the roving props and the fitment target ref. The
  // tree's getItemProps already returns a `ref` (it registers the node for
  // roving focus); COMPOSE ours with it rather than replacing it, or the
  // submenu parent loses its focus registration.
  const baseItemProps = getItemProps(item);
  const navRef = (baseItemProps as { ref?: React.Ref<HTMLElement> }).ref;
  const itemProps = {
    ...baseItemProps,
    // The composed `aria-expanded` (from getMenuItemProps) tracks only the
    // keyboard highlight branch: it reports false for a HOVER-opened submenu
    // and true for a merely-highlighted parent whose popup is not even
    // mounted. Override with the REAL open state (WCAG 4.1.2 name/role/value).
    "aria-expanded": open,
    // Point at the popup only while it exists — the surface is unmounted when
    // closed, and a dangling IDREF is invalid ARIA.
    "aria-controls": open ? submenuId : undefined,
    ref: (node: HTMLDivElement | null) => {
      targetRef.current = node;
      if (typeof navRef === "function") navRef(node);
      else if (navRef)
        (navRef as React.RefObject<HTMLElement | null>).current = node;
    },
  };

  // On keyboard open, move focus to the submenu's roving tab stop (the newly
  // highlighted child the tree already set tabindex=0 on).
  // @note Impure — moves DOM focus.
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open || !keyboardOpen || typeof window === "undefined") return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        surface
          .querySelector<HTMLElement>('[role="menuitem"][tabindex="0"]')
          ?.focus();
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [open, keyboardOpen]);

  const menuProps = getMenuProps({
    label: item.label,
    ref: popupRef,
  }) as React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  };

  // Render the popup ONLY while open. A closed submenu mounts no popup, so its
  // `popupRef` stays null and `useWindowFitment` measures nothing — no
  // ResizeObserver, no reposition, and crucially no measure→reposition→measure
  // feedback across a tree of always-mounted hidden popups (which froze the UI).
  const submenuSurface = open ? (
    <div
      className={[
        "ds",
        "contextual-menu__surface",
        "submenu",
        "modal",
        bestPosition?.positionName,
      ]
        .filter(Boolean)
        .join(" ")}
      id={submenuId}
      aria-hidden={false}
      // Reveal visually only once positioned. The submenu mounts on open but
      // `bestPosition` resolves a frame later; without this gate it paints for a
      // frame at the fallback top:0/left:0 before snapping to the anchor.
      data-positioned={bestPosition ? "true" : undefined}
      style={popupPositionStyle}
      {...menuProps}
      // After the spread so this composing callback wins over menuProps.ref
      // (later JSX props override earlier ones): it captures the surface for
      // the keyboard-open focus effect AND forwards to the tree's ref.
      ref={(el) => {
        surfaceRef.current = el;
        if (typeof menuProps.ref === "function") menuProps.ref(el);
        else if (menuProps.ref)
          (menuProps.ref as React.RefObject<HTMLElement | null>).current = el;
      }}
    >
      {children.map((child) => (
        // Recurse: a submenu child may itself be a submenu parent.
        <SubMenu key={getItemId(child)} item={child} />
      ))}
    </div>
  ) : null;

  return (
    <div
      className="submenu-anchor"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Item
        item={item}
        itemProps={itemProps}
        onSelect={() => onSelectItem(item)}
      />
      {submenuSurface && typeof window !== "undefined"
        ? createPortal(submenuSurface, document.body)
        : null}
    </div>
  );
};

export default SubMenu;
