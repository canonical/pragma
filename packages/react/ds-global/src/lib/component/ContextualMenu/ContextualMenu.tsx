import type { _Item } from "@canonical/ds-types";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MENU_ROOT_PLACEMENT,
  useContextualMenu,
  useIsMounted,
} from "../../hooks/index.js";
import MenuContext from "./common/MenuContext.js";
import SubMenu from "./common/SubMenu/index.js";
import type { ContextualMenuProps, MenuItem } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds contextual-menu";

/**
 * A contextual menu presents a list of grouped actions anchored to a trigger.
 * It opens on click, positions itself with viewport-fitment, and supports full
 * keyboard navigation including arrow traversal across groups.
 *
 * `import { ContextualMenu } from "@canonical/react-ds-global";`
 *
 * @implements dso:global.component.contextual-menu
 */
const ContextualMenu = ({
  trigger,
  groups,
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
  // A synthetic root holds the groups so the tree is menu -> group -> item.
  // MUST be stable across renders: the hook annotates it (memoised on `root`)
  // and the open effect keys on the annotated root, so a fresh object each
  // render re-fires that effect every render → dispatch → re-render → freeze.
  const root = useMemo(
    () => ({ key: "contextual-menu-root", items: groups }),
    [groups],
  );
  // Portal only after mount so the server and first client render agree —
  // `typeof window` is already truthy on the first client render, which would
  // portal the menu on render 0 and mismatch the inline server output.
  const mounted = useIsMounted();
  const menu = useContextualMenu({
    root,
    isOpen: open,
    // Open BELOW the trigger, leading-aligned, flipping above then to the side
    // as space runs out (design review). MENU_ROOT_PLACEMENT is logical, so the
    // hook mirrors alignment in RTL automatically — no direction read here.
    // (Submenus keep the side-opening MENU_PLACEMENT — see SubMenu.)
    preferredDirections: preferredDirections ?? MENU_ROOT_PLACEMENT,
    distance,
    gutter,
    maxWidth,
    autoFit: autoFit ?? true,
    wrap,
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
    getGroupProps,
    getItemProps,
  } = menu;

  const triggerProps = getTriggerProps();
  const annotatedGroups = annotatedRoot.items ?? [];

  // The shared menu API threaded to every (nested) level. One state, one
  // highlight path, one keyboard handler — submenus are render-only. Memoised so
  // the context value is stable across renders; an unstable value would re-render
  // every SubMenu (and re-run their positioning) on every commit.
  const menuContextValue = useMemo(
    () => ({
      getItemProps,
      getMenuProps,
      getGroupProps,
      getNodeStatus,
      highlightItem,
      close,
      onSelectItem: (item: _Item<MenuItem>) => {
        onSelect?.(item);
        close();
      },
    }),
    [
      getItemProps,
      getMenuProps,
      getGroupProps,
      getNodeStatus,
      highlightItem,
      close,
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
      {annotatedGroups.map((group) => (
        <div
          key={getItemId(group)}
          className="group"
          {...getGroupProps({ label: group.label })}
        >
          {(group.items ?? []).map((item) => (
            // SubMenu renders the item and, if it is a submenu parent, its
            // nested popup (recursively). Leaves render as a plain item.
            <SubMenu key={getItemId(item)} item={item} />
          ))}
        </div>
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
        {mounted ? createPortal(menuElement, document.body) : menuElement}
      </div>
    </MenuContext.Provider>
  );
};

export default ContextualMenu;
