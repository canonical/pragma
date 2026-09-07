import type { MenuEntry, MenuItem } from "@canonical/react-ds-global";
import { ContextualMenu, Icon } from "@canonical/react-ds-global";
import type React from "react";
import { GroupHeader } from "../GroupHeader/index.js";
import type { ContextSwitcherItem, ContextSwitcherProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-context-switcher";
const surfaceCssClassName = "ds side-navigation-context-switcher-surface";

/**
 * A context or "create context" entry, as actually constructed below —
 * `description`/`badge`/`isCurrent`/`renderLabel` aren't part of the public
 * `MenuItem` shape (they're this component's own extension of it, not
 * something every `ContextualMenu` consumer needs), so this local type,
 * not a cast at each read site, carries them through construction and both
 * custom renderers below.
 */
interface ContextMenuItem extends MenuItem {
  description?: ContextSwitcherItem["description"];
  badge?: ContextSwitcherItem["badge"];
  isCurrent?: boolean;
  /** "Create context" only — the visible (possibly rich) label; `label` itself stays a plain string for type-ahead. */
  renderLabel?: React.ReactNode;
}

/**
 * A context in the dropdown list — rendered custom (not `ContextualMenu`'s
 * own default icon+label+slot layout) so it can stack a description line
 * under the name and mark the current context, matching the Figma source.
 * `isCurrent` and `description`/`badge` aren't part of `MenuItem` itself;
 * cast rather than extending the public type, since only this module ever
 * constructs one of these.
 */
const ContextItemContent = ({
  item,
}: {
  item: MenuItem;
}): React.ReactElement => {
  const { description, badge, isCurrent } = item as ContextMenuItem;
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
 * The "create context" action's own content — a plain icon+label, but built
 * as a custom renderer (not `ContextualMenu`'s own default layout) only
 * because `createContextLabel` is a `ReactNode` (SPEC.md's own convention
 * for label-like props elsewhere in this file) and `MenuItem.label` is a
 * plain `string`.
 */
const CreateContextContent = ({
  item,
}: {
  item: MenuItem;
}): React.ReactElement => {
  const { renderLabel } = item as ContextMenuItem;
  return (
    <>
      <Icon icon="plus" />
      <span className="label">{renderLabel}</span>
    </>
  );
};

/**
 * SideNavigation.ContextSwitcher — a dropdown for products that divide into
 * different contexts, projects, users, or similar (SPEC.md §4.3, §4.5).
 * Renders via `ContextualMenu` — a real `<button>` trigger
 * (`aria-haspopup="menu"`/`aria-expanded`) and a `role="menu"` popup with
 * full roving-focus keyboard navigation (arrow keys, Home/End, type-ahead) —
 * a "select"-like widget, not a bare `<details>`/`<summary>` disclosure with
 * a plain list of buttons (SPEC.md §9.21; this used to render via `Popover`,
 * which is exactly that). `title`, when given, renders via
 * `SideNavigation.GroupHeader` immediately above the dropdown field — a
 * real sibling in the Fragment this returns, not part of `ContextualMenu`
 * itself, matching the Figma source's own `group-heading` sub-component
 * there (node `657:39353`).
 *
 * Not currently part of the `NavRoot`/`NavGroup` content-tree data model —
 * SPEC.md §4.5's "content-defined position" is realised by composing this
 * component directly where the consumer wants it (e.g. via
 * `SideNavigation.Content`'s `children` fallback), not by a `root.items`
 * entry kind. See SPEC.md's known issues for the rationale.
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
      // A plain string for type-ahead/the tree's own bookkeeping — the
      // visible content (which may be a richer ReactNode) is rendered by
      // CreateContextContent instead, via `renderLabel`.
      label:
        typeof createContextLabel === "string"
          ? createContextLabel
          : "Create context",
      renderLabel: createContextLabel,
      displayItemsType: "custom",
      Component: CreateContextContent,
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
    <>
      {title != null && <GroupHeader>{title}</GroupHeader>}
      <ContextualMenu
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        surfaceClassName={surfaceCssClassName}
        trigger={
          <span className="row">
            <span className="label">{currentContext.name}</span>
            <Icon icon="chevron-down" className="end caret" />
          </span>
        }
        items={items}
        onSelect={handleSelect}
        {...props}
      />
    </>
  );
};

export default ContextSwitcher;
