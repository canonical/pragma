import type { _Item } from "@canonical/ds-types";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { MENU_PLACEMENT, useContextualMenu } from "../../hooks/index.js";
import MenuContext from "./common/MenuContext.js";
import SubMenu from "./common/SubMenu/index.js";
import type { ContextualMenuProps, MenuItem } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds contextual-menu";

/**
 * A contextual menu presents a flat list of actions — optionally partitioned
 * by separators — anchored to a trigger. It opens on click, positions itself
 * with viewport-fitment, and supports full keyboard navigation.
 *
 * `import { ContextualMenu } from "@canonical/react-ds-global";`
 *
 * @implements dso:global.component.contextual-menu
 */
const ContextualMenu = ({
  trigger,
  items,
  label,
  className,
  preferredDirections,
  distance,
  gutter,
  maxWidth,
  autoFit,
  wrap,
  onSelect,
  open,
  onOpenChange,
  ...props
}: ContextualMenuProps): React.ReactElement => {
  // A synthetic root holds the entries so the tree is menu -> item.
  // MUST be stable across renders: the hook annotates it (memoised on `root`),
  // so a fresh object each render would re-annotate the tree every render.
  const root = useMemo(() => ({ key: "contextual-menu-root", items }), [items]);
  const menu = useContextualMenu({
    root,
    isOpen: open,
    // Open toward the trigger's leading edge, top-aligned, flipping side/
    // alignment as space runs out. MENU_PLACEMENT is logical (inline-*), so the
    // hook mirrors it in RTL automatically — no direction read here.
    preferredDirections: preferredDirections ?? MENU_PLACEMENT,
    distance,
    gutter,
    maxWidth,
    autoFit: autoFit ?? true,
    // Menus conventionally wrap: ArrowDown on the last item loops to the
    // first (APG menu pattern). Opt out with `wrap={false}`.
    wrap: wrap ?? true,
    onShow: () => onOpenChange?.(true),
    onHide: () => onOpenChange?.(false),
  });

  const {
    isOpen,
    close,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    annotatedRoot,
    getNodeStatus,
    highlightItem,
    getTriggerProps,
    getMenuProps,
    getItemProps,
  } = menu;

  const triggerProps = getTriggerProps();
  const annotatedEntries = annotatedRoot.items ?? [];

  // The shared menu API threaded to every (nested) level. One state, one
  // highlight path, one keyboard handler — submenus are render-only. Memoised so
  // the context value is stable across renders; an unstable value would re-render
  // every SubMenu (and re-run their positioning) on every commit.
  const menuContextValue = useMemo(
    () => ({
      getItemProps,
      getMenuProps,
      getNodeStatus,
      highlightItem,
      close,
      // Submenus gate their own visibility on the ROOT open state: their
      // hover state is local, so without this a mouse-selected nested leaf
      // would close the root surface while the hovered submenu stayed up.
      isOpen,
      onSelectItem: (item: _Item<MenuItem>) => {
        onSelect?.(item);
        close();
      },
    }),
    [
      getItemProps,
      getMenuProps,
      getNodeStatus,
      highlightItem,
      close,
      isOpen,
      onSelect,
    ],
  );

  // With no explicit `label`, the menu is named by its trigger — so the trigger
  // needs a stable id the menu can point `aria-labelledby` at (pointing at the
  // menu's own id would leave it unnamed).
  const triggerId = `${popupId}-trigger`;

  // getMenuProps returns a generic prop bag from the headless navigation hook
  // (loose event-handler and ref types); it is spread onto the menu container.
  const menuProps = getMenuProps({
    label,
    labelledBy: label ? undefined : triggerId,
    // Compose the positioning ref with the menu's keyboard ref.
    ref: popupRef,
  }) as React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  };

  const menuElement = (
    <div
      className={[
        `${componentCssClassName}__surface`,
        "modal",
        bestPosition?.positionName,
      ]
        .filter(Boolean)
        .join(" ")}
      id={popupId}
      aria-hidden={!isOpen}
      style={popupPositionStyle}
      {...menuProps}
    >
      {annotatedEntries.map((entry) => (
        // SubMenu renders a separator as a divider, a submenu parent as the
        // item plus its nested popup (recursively), and a leaf as a plain item.
        <SubMenu key={getItemId(entry)} item={entry} />
      ))}
    </div>
  );

  return (
    <MenuContext.Provider value={menuContextValue}>
      <div
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        {...props}
      >
        {/* getTriggerProps drives the disclosure (the source of truth for open)
            and carries the menu ARIA wiring. The disclosure's target ref sits on
            the BUTTON, not the wrapper: closing returns focus via
            `targetRef.current?.focus()`, and `focus()` on a non-focusable div is
            a no-op — focus would silently fall to <body> (WCAG 2.4.3). The
            fitment hook types its anchor as a div; the button anchors the same
            rect, so cast (Popover precedent). */}
        <button
          type="button"
          id={triggerId}
          className="trigger"
          ref={targetRef as React.Ref<HTMLButtonElement>}
          {...triggerProps}
        >
          {trigger}
        </button>
        {typeof window !== "undefined"
          ? createPortal(menuElement, document.body)
          : menuElement}
      </div>
    </MenuContext.Provider>
  );
};

export default ContextualMenu;
