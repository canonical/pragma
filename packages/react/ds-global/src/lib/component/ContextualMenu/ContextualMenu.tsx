import type { _Item } from "@canonical/ds-types";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { MENU_PLACEMENT, useContextualMenu } from "#lib/hooks/index.js";
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

  // getMenuProps returns a generic prop bag from the headless navigation hook
  // (loose event-handler and ref types); it is spread onto the menu container.
  const menuProps = getMenuProps({
    label,
    labelledBy: label ? undefined : popupId,
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
        ref={targetRef}
        {...props}
      >
        {/* getTriggerProps drives the disclosure (the source of truth for open)
            and carries the menu ARIA wiring. */}
        <button type="button" className="trigger" {...triggerProps}>
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
