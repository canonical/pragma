import { getItemId } from "@canonical/utils";
import type React from "react";
import { createPortal } from "react-dom";
import { useContextualMenu } from "#lib/hooks/index.js";
import Item from "./common/Item/index.js";
import type { ContextualMenuProps } from "./types.js";
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
  const menu = useContextualMenu({
    // A synthetic root holds the groups so the tree is menu -> group -> item.
    root: { key: "contextual-menu-root", items: groups },
    isOpen: open,
    preferredDirections,
    distance,
    gutter,
    maxWidth,
    autoFit,
    wrap,
    onShow: () => onOpenChange?.(true),
    onHide: () => onOpenChange?.(false),
  });

  const {
    isOpen,
    toggle,
    close,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    annotatedRoot,
    getTriggerProps,
    getMenuProps,
    getGroupProps,
    getItemProps,
  } = menu;

  const triggerProps = getTriggerProps();
  const annotatedGroups = annotatedRoot.items ?? [];

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
            <Item
              key={getItemId(item)}
              item={item}
              itemProps={getItemProps(item)}
              onSelect={() => {
                onSelect?.(item);
                close();
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
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
  );
};

export default ContextualMenu;
