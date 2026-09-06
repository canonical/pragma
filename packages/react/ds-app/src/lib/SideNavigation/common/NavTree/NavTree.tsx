import type { _Item } from "@canonical/ds-types";
import type { LinkComponent } from "@canonical/react-ds-global";
import { useNavigationTree } from "@canonical/react-hooks";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { Fragment, useEffect } from "react";
import type { _AnyNavNode } from "../../types.js";
import { Group } from "../Group/index.js";
import { Item } from "../Item/index.js";
import { ItemButton } from "../ItemButton/index.js";
import { ItemExpandable } from "../ItemExpandable/index.js";
import { ItemSwitch } from "../ItemSwitch/index.js";
import { Separator } from "../Separator/index.js";
import type { NavTreeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds nav-tree";

/**
 * Renders a single content-tree entry (never an expandable's own row — the
 * caller renders that directly; this is for entries with no `items`),
 * dispatching on `control` to one of the three row variants (SPEC.md §4.4).
 * Strips the tree-annotation fields (`_Item<T>`: `parentUrl`, `depth`) and
 * every field not meaningful to the chosen variant before spreading the
 * rest — several of those (`url`, `slot`, `onClick`, `checked`, …) either
 * don't exist on the target's props at all, or collide with a same-named
 * native HTML attribute of a different type (`slot` is a global attribute
 * on every element; a bare `onClick` expects a `MouseEvent` handler, not
 * this module's `() => void`), so leaving them in would either be a type
 * error or a silent DOM leak. `label` (the authored data field, a plain
 * string) is passed in as `children` — Item/ItemButton/ItemSwitch each
 * compose their content via `children`, not a same-named `label` prop.
 */
const renderEntry = (
  entry: _Item<_AnyNavNode>,
  active: boolean,
  LinkComponent: LinkComponent,
): React.ReactElement => {
  const entryId = getItemId(entry);
  const {
    parentUrl: _parentUrl,
    depth: _depth,
    items: _items,
    separator: _separator,
    label,
    control,
    onClick,
    checked,
    defaultChecked,
    onCheckedChange,
    ...rest
  } = entry;

  if (control === "button") {
    const { url: _url, ...buttonFields } = rest;
    return (
      <ItemButton key={entryId} {...buttonFields} onClick={onClick}>
        {label}
      </ItemButton>
    );
  }

  if (control === "switch") {
    const { url: _url, slot: _slot, ...switchFields } = rest;
    return (
      <ItemSwitch
        key={entryId}
        {...switchFields}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
      >
        {label}
      </ItemSwitch>
    );
  }

  return (
    <Item key={entryId} {...rest} active={active} LinkComponent={LinkComponent}>
      {label}
    </Item>
  );
};

/**
 * Internal: renders a content tree with two explicit loops (no recursion),
 * deriving active/expanded state from useNavigationTree. Shared by Content
 * and Footer — each region drives its own hook instance over its own root.
 *
 *   Loop 1 — root's direct children: each is a SideNavigation.Group
 *     (rendered with its optional SideNavigation.GroupHeader), optionally
 *     preceded by a SideNavigation.Separator when the group's own
 *     `separator: true` flag is set — this replaces every-group-except-
 *     the-first automatic CSS divider with an explicit per-group opt-in
 *     (SPEC.md §4.3). A section with no `items` at all (the bare
 *     `NavSeparator` shape — no group content, just a divider between two
 *     groups) renders *only* the Separator; a phantom empty Group is never
 *     emitted for it.
 *   Loop 2 — a group's entries: each is a leaf row (renderEntry — Item,
 *     ItemButton, or ItemSwitch, by `control`) or a
 *     SideNavigation.ItemExpandable (has `items` — its own children, always
 *     leaves, rendered by a nested loop inside this same pass, through the
 *     same renderEntry).
 *
 * The hook is generic over `_AnyNavNode` (the union of every field any tier
 * can carry — SPEC.md §4.3), so `icon`/`slot`/`separator`/`control`/`items`
 * all survive typed onto the annotated nodes regardless of which tier they
 * came from. `currentUrl` seeds initial selection and re-syncs it on
 * navigation (the hook's `initialUrl` is mount-only), so the active item —
 * and, via `inSelectedBranch`, its ItemExpandable ancestors' initial open
 * state — stays in sync with the consumer's router.
 */
const NavTree = ({
  root,
  currentUrl,
  LinkComponent = "a",
  className,
  ...props
}: NavTreeProps): React.ReactElement => {
  // `LeafNavItem` deliberately leaves `key`/`url` both optional (types.ts's
  // own doc: a discriminated union is "meaningfully more ceremony" for what
  // is, in practice, always one shape per authored item) — looser than
  // `_AnyNavNode`'s WD405 identity requirement, which `useNavigationTree`'s
  // own `T extends Item` bound needs structurally. The cast trusts that
  // contract rather than tightening the public `NavItem` shape.
  const nav = useNavigationTree<_AnyNavNode>({
    root: root as _AnyNavNode,
    initialUrl: currentUrl,
  });
  const { index, selectItem } = nav;

  useEffect(() => {
    if (currentUrl === undefined) return;
    const match = index[currentUrl];
    if (match) selectItem(match);
  }, [currentUrl, index, selectItem]);

  const sections = nav.annotatedRoot.items ?? [];

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* Loop 1 — root's direct children: groups, each optionally preceded
          by a separator (section.separator); a section with no items at
          all is a bare divider — Separator only, no empty Group. */}
      {sections.map((section) => {
        const sectionId = getItemId(section);

        const entries = section.items ?? [];

        return (
          <Fragment key={sectionId}>
            {section.separator && <Separator />}
            {entries.length > 0 && (
              <Group label={section.label}>
                {/* Loop 2 — a group's entries: leaf rows or expandable items */}
                {entries.map((entry) => {
                  const entryId = getItemId(entry);
                  const children = entry.items ?? [];

                  if (children.length > 0) {
                    const {
                      parentUrl: _parentUrl,
                      depth: _depth,
                      items: _items,
                      separator: _separator,
                      control: _control,
                      onClick: _onClick,
                      checked: _checked,
                      defaultChecked: _defaultChecked,
                      onCheckedChange: _onCheckedChange,
                      slot: _slot,
                      url: _url,
                      label,
                      ...expandableFields
                    } = entry;
                    return (
                      <ItemExpandable
                        key={entryId}
                        {...expandableFields}
                        heading={label}
                        defaultExpanded={
                          nav.getNodeStatus(entry).inSelectedBranch
                        }
                      >
                        {children.map((child) =>
                          renderEntry(
                            child,
                            nav.getNodeStatus(child).selected,
                            LinkComponent,
                          ),
                        )}
                      </ItemExpandable>
                    );
                  }

                  return renderEntry(
                    entry,
                    nav.getNodeStatus(entry).selected,
                    LinkComponent,
                  );
                })}
              </Group>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

export default NavTree;
