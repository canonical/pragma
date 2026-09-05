import { useNavigationTree } from "@canonical/react-hooks";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { useEffect } from "react";
import type { _AnyNavNode } from "../../types.js";
import { Group } from "../Group/index.js";
import { Item } from "../Item/index.js";
import { ItemExpandable } from "../ItemExpandable/index.js";
import { Separator } from "../Separator/index.js";
import type { NavTreeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds nav-tree";

/**
 * Internal: renders a content tree with two explicit loops (no recursion),
 * deriving active/expanded state from useNavigationTree. Shared by Content
 * and Footer — each region drives its own hook instance over its own root.
 *
 *   Loop 1 — root's direct children: each is either a SideNavigation.Group
 *     (rendered with its optional SideNavigation.GroupHeader) or a
 *     SideNavigation.Separator (a `separator: true` entry).
 *   Loop 2 — a group's entries: each is a SideNavigation.Item (leaf) or a
 *     SideNavigation.ItemExpandable (has `items` — its own children, always
 *     leaves, rendered by a nested loop inside this same pass).
 *
 * The hook is generic over `_AnyNavNode` (the union of every field any tier
 * can carry — SPEC.md §4.3), so `icon`/`slot`/`separator`/`items` all survive
 * typed onto the annotated nodes regardless of which tier they came from.
 * `currentUrl` seeds initial selection and re-syncs it on navigation (the
 * hook's `initialUrl` is mount-only), so the active item — and, via
 * `inSelectedBranch`, its ItemExpandable ancestors' initial open state —
 * stays in sync with the consumer's router.
 */
const NavTree = ({
  root,
  currentUrl,
  LinkComponent = "a",
  className,
  ...props
}: NavTreeProps): React.ReactElement => {
  const nav = useNavigationTree<_AnyNavNode>({ root, initialUrl: currentUrl });
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
      {/* Loop 1 — root's direct children: groups or separators */}
      {sections.map((section) => {
        const sectionId = getItemId(section);

        if (section.separator) {
          return <Separator key={sectionId} />;
        }

        const entries = section.items ?? [];

        return (
          <Group key={sectionId} label={section.label}>
            {/* Loop 2 — a group's entries: leaf items or expandable items */}
            {entries.map((entry) => {
              const entryId = getItemId(entry);
              const children = entry.items ?? [];

              // Strip the tree-annotation fields (_Item<T>: parentUrl, depth)
              // and `items`/`separator` (not part of Item/ItemExpandable's
              // props) before spreading the rest onto a presentational
              // subcomponent. The expandable branch also drops `slot` — an
              // ExpandableNavItem never has one (SPEC.md §4.3: the end slot is
              // always the caret), and leaving it in would otherwise collide
              // with the native HTML global `slot` attribute (which
              // `ComponentProps<"li">` still exposes, since
              // `ItemExpandableProps` has no `slot` of its own to `Omit` it
              // via `keyof OwnProps`).
              const {
                parentUrl: _parentUrl,
                depth: _depth,
                items: _items,
                separator: _separator,
                ...entryFields
              } = entry;

              if (children.length > 0) {
                const { slot: _slot, ...expandableFields } = entryFields;
                return (
                  <ItemExpandable
                    key={entryId}
                    {...expandableFields}
                    defaultExpanded={nav.getNodeStatus(entry).inSelectedBranch}
                  >
                    {children.map((child) => {
                      const {
                        parentUrl: _childParentUrl,
                        depth: _childDepth,
                        items: _childItems,
                        separator: _childSeparator,
                        ...childFields
                      } = child;
                      return (
                        <Item
                          key={getItemId(child)}
                          {...childFields}
                          active={nav.getNodeStatus(child).selected}
                          LinkComponent={LinkComponent}
                        />
                      );
                    })}
                  </ItemExpandable>
                );
              }

              return (
                <Item
                  key={entryId}
                  {...entryFields}
                  active={nav.getNodeStatus(entry).selected}
                  LinkComponent={LinkComponent}
                />
              );
            })}
          </Group>
        );
      })}
    </div>
  );
};

export default NavTree;
