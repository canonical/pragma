import type { MenuEntry, MenuItem } from "@canonical/react-ds-global";
import { ContextualMenu, Icon } from "@canonical/react-ds-global";
import type React from "react";
import { GroupHeader } from "../GroupHeader/index.js";
import type { ContextSwitcherItem, ContextSwitcherProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-context-switcher";

/**
 * One renderer for both entry shapes the switcher puts in the menu: a
 * context (name, optional description/badge, the current one marked) and
 * the "create context" action (icon + label). `MenuItem` carries none of
 * those fields; this local type, not casts at each read site, carries
 * them through construction and the renderer.
 */
type ContextMenuItem = MenuItem & {
  description?: ContextSwitcherItem["description"];
  badge?: ContextSwitcherItem["badge"];
  isCurrent?: boolean;
  /** "Create context" only — the visible (possibly rich) label; `label` itself stays a plain string for type-ahead. */
  renderLabel?: React.ReactNode;
};

/**
 * A context or "create context" entry — see {@link ContextMenuItem}.
 */
const ContextItemContent = ({
  item,
}: {
  item: MenuItem;
}): React.ReactElement => {
  const { description, badge, isCurrent, renderLabel } =
    item as ContextMenuItem;

  // The "create context" action: a plain icon + label row.
  if (renderLabel != null) {
    return (
      <span className="create-context">
        <Icon icon="plus" />
        <span className="label">{renderLabel}</span>
      </span>
    );
  }

  return (
    <span
      className={["content", isCurrent && "current"].filter(Boolean).join(" ")}
    >
      <span className="name">{item.label}</span>
      {description ? <span className="description">{description}</span> : null}
      {badge ? <span className="badge">{badge}</span> : null}
    </span>
  );
};

/**
 * SideNavigation.ContextSwitcher — a dropdown for products that divide
 * into contexts, projects, users, or similar. Renders via
 * `ContextualMenu`: a real `<button>` trigger
 * (`aria-haspopup="menu"`/`aria-expanded`) and a `role="menu"` popup with
 * full roving-focus keyboard navigation. `title`, when given, renders via
 * `SideNavigation.GroupHeader` as a sibling above the dropdown field.
 *
 * Not part of the `NavRoot`/`NavGroup` content-tree data model — its
 * position is content-defined: compose this component directly where
 * the consumer wants it. See SPEC.md's known issues.
 *
 * @implements ds:apps.subcomponent.side-navigation-context-switcher
 */
const ContextSwitcher = ({
  title,
  currentContext,
  contexts,
  onContextChange,
  onCreateContext,
  createContextLabel = "Create context",
  className,
  open,
  onOpenChange,
  preferredDirections,
  distance,
  gutter,
  maxWidth,
  autoFit,
  ...props
}: ContextSwitcherProps): React.ReactElement => {
  const contextItems: ContextMenuItem[] = contexts.map((context) => ({
    key: context.key,
    label: context.name,
    description: context.description,
    badge: context.badge,
    isCurrent: context.key === currentContext.key,
    displayItemsType: "custom",
    Component: ContextItemContent,
  }));

  const items: MenuEntry[] = contextItems;

  if (onCreateContext) {
    const createContextItem: ContextMenuItem = {
      key: "create-context",
      // A plain string for type-ahead bookkeeping — the visible (possibly
      // rich) content renders via `renderLabel` in ContextItemContent.
      label:
        typeof createContextLabel === "string"
          ? createContextLabel
          : "Create context",
      renderLabel: createContextLabel,
      displayItemsType: "custom",
      Component: ContextItemContent,
    };
    items.push({ type: "separator", key: "create-context-separator" });
    items.push(createContextItem);
  }

  const handleSelect = (item: MenuItem) => {
    if (item.key === "create-context") {
      onCreateContext?.();
      return;
    }
    const context = contexts.find((candidate) => candidate.key === item.key);
    if (context) onContextChange?.(context);
  };

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {title != null && <GroupHeader>{title}</GroupHeader>}
      <ContextualMenu
        open={open}
        onOpenChange={onOpenChange}
        preferredDirections={preferredDirections}
        distance={distance}
        gutter={gutter}
        maxWidth={
          maxWidth ??
          "calc(var(--sidenav-rail-inline-size) - 2 * var(--sidenav-inset-inline))"
        }
        autoFit={autoFit}
        items={items}
        onSelect={handleSelect}
      >
        <span className="row">
          <span className="label">{currentContext.name}</span>
          <Icon icon="chevron-down" className="end caret" />
        </span>
      </ContextualMenu>
    </div>
  );
};

export default ContextSwitcher;
