import type { _Item } from "@canonical/ds-types";
import { getItemId } from "@canonical/ds-utils";
import type React from "react";
import { useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MENU_ROOT_PLACEMENT,
  useContextualMenu,
  useIsMounted,
} from "../../hooks/index.js";
import { Button } from "../Button/index.js";
import MenuContext from "./common/MenuContext.js";
import SubMenu from "./common/SubMenu/index.js";
import type { ContextualMenuProps, MenuItem } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds contextual-menu";

const setRef = <T,>(ref: React.Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
};

const composeHandlers =
  <TEvent extends React.SyntheticEvent>(
    consumerHandler: ((event: TEvent) => void) | undefined,
    internalHandler: ((event: TEvent) => void) | undefined,
  ) =>
  (event: TEvent) => {
    consumerHandler?.(event);
    if (!event.defaultPrevented) internalHandler?.(event);
  };

/**
 * A contextual menu presents a flat list of actions — optionally partitioned
 * by separators — anchored to a trigger. It opens on click, positions itself
 * with viewport-fitment, and supports full keyboard navigation.
 *
 * `import { ContextualMenu } from "@canonical/react-ds-global";`
 *
 * @implements ds:global.component.contextual_menu
 */
const ContextualMenu = ({
  trigger,
  triggerProps: buttonTriggerProps,
  items,
  label,
  className,
  preferredDirections,
  distance,
  gutter,
  maxWidth,
  autoFit,
  wrap,
  highlightFirstItem,
  closeOnEscape,
  closeOnOutsideClick,
  onSelect,
  open,
  onOpenChange,
  ...props
}: ContextualMenuProps): React.ReactElement => {
  // A synthetic root holds the entries so the tree is menu -> item.
  // MUST be stable across renders: the hook annotates it (memoised on `root`),
  // so a fresh object each render would re-annotate the tree every render.
  const root = useMemo(() => ({ key: "contextual-menu-root", items }), [items]);
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
    // Menus conventionally wrap: ArrowDown on the last item loops to the
    // first (APG menu pattern). Opt out with `wrap={false}`.
    wrap: wrap ?? true,
    highlightFirstItem,
    closeOnEscape,
    closeOnOutsideClick,
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

  const menuEntries = annotatedRoot.items ?? [];

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
        item.onSelect?.(item);
        onSelect?.(item);
        close();
      },
      ownerId: popupId,
    }),
    [
      getItemProps,
      getMenuProps,
      getNodeStatus,
      highlightItem,
      close,
      isOpen,
      onSelect,
      popupId,
    ],
  );

  // With no explicit `label`, the menu is named by its trigger — so the trigger
  // needs a stable id the menu can point `aria-labelledby` at (pointing at the
  // menu's own id would leave it unnamed).
  const triggerId = `${popupId}-trigger`;

  // getMenuProps returns a generic prop bag from the headless navigation hook
  // (loose event-handler and ref types); it is spread onto the menu container.
  const menuProps = getMenuProps({
    label: label || undefined,
    labelledBy: label ? undefined : triggerId,
    // Compose the positioning ref with the menu's keyboard ref.
    ref: popupRef,
  }) as React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  };

  const { ref: menuPropsRef, ...restMenuProps } = menuProps;
  const composedMenuRef = useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node;
      setRef(menuPropsRef, node);
    },
    [popupRef, menuPropsRef],
  );

  const menuElement = (
    <div
      className={[
        // Spelled out rather than interpolated from componentCssClassName: the
        // portal target sits outside the caller's subtree, so this root marks
        // its own pragma territory, and that must not depend on another
        // constant keeping its "ds " prefix. SubMenu.tsx does the same.
        "ds",
        "contextual-menu__surface",
        "modal",
        bestPosition?.positionName,
      ]
        .filter(Boolean)
        .join(" ")}
      {...restMenuProps}
      id={popupId}
      data-contextual-menu-owner={popupId}
      aria-hidden={!isOpen}
      style={popupPositionStyle}
      ref={composedMenuRef}
    >
      {menuEntries.map((entry) => (
        // SubMenu renders a separator as a divider, a submenu parent as the
        // item plus its nested popup (recursively), and a leaf as a plain item.
        <SubMenu key={getItemId(entry)} item={entry} />
      ))}
    </div>
  );

  const disclosureTriggerProps =
    getTriggerProps() as React.ComponentProps<"button">;
  const {
    className: buttonTriggerClassName,
    ref: buttonTriggerRef,
    onClick: buttonTriggerOnClick,
    onKeyDown: buttonTriggerOnKeyDown,
    onFocus: buttonTriggerOnFocus,
    onBlur: buttonTriggerOnBlur,
    ...restButtonTriggerProps
  } = buttonTriggerProps ?? {};
  const {
    ref: disclosureTriggerRef,
    onClick: disclosureTriggerOnClick,
    onKeyDown: disclosureTriggerOnKeyDown,
    onFocus: disclosureTriggerOnFocus,
    onBlur: disclosureTriggerOnBlur,
    ...restDisclosureTriggerProps
  } = disclosureTriggerProps;
  const composedTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      targetRef.current = node;
      setRef(
        disclosureTriggerRef as React.Ref<HTMLButtonElement> | undefined,
        node,
      );
      setRef(buttonTriggerRef, node);
    },
    [targetRef, disclosureTriggerRef, buttonTriggerRef],
  );

  const triggerElement = buttonTriggerProps ? (
    <Button
      {...restButtonTriggerProps}
      {...restDisclosureTriggerProps}
      type={restButtonTriggerProps.type ?? "button"}
      id={triggerId}
      className={["trigger", buttonTriggerClassName].filter(Boolean).join(" ")}
      ref={composedTriggerRef}
      onClick={composeHandlers(buttonTriggerOnClick, disclosureTriggerOnClick)}
      onKeyDown={composeHandlers(
        buttonTriggerOnKeyDown,
        disclosureTriggerOnKeyDown,
      )}
      onFocus={composeHandlers(buttonTriggerOnFocus, disclosureTriggerOnFocus)}
      onBlur={composeHandlers(buttonTriggerOnBlur, disclosureTriggerOnBlur)}
    >
      {trigger}
    </Button>
  ) : (
    <button
      type="button"
      id={triggerId}
      className="trigger"
      {...restDisclosureTriggerProps}
      ref={composedTriggerRef}
      onClick={disclosureTriggerOnClick}
      onKeyDown={disclosureTriggerOnKeyDown}
      onFocus={disclosureTriggerOnFocus}
      onBlur={disclosureTriggerOnBlur}
    >
      {trigger}
    </button>
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
        {triggerElement}
        {mounted ? createPortal(menuElement, document.body) : menuElement}
      </div>
    </MenuContext.Provider>
  );
};

export default ContextualMenu;
