import type { _Item } from "@canonical/ds-types";
import { getItemId } from "@canonical/ds-utils";
import type { LinkComponent } from "@canonical/react-ds-global";
import { useNavigationTree } from "@canonical/react-hooks";
import type React from "react";
import { Fragment, useEffect } from "react";
import type { _AnyNavNode } from "../../types.js";
import { Group } from "../Group/index.js";
import { Item } from "../Item/index.js";
import { ItemExpandable } from "../ItemExpandable/index.js";
import type { NavTreeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds nav-tree";

/**
 * A stable React key for a tree node. `getItemId` resolves `url` or `key`;
 * the public `LeafNavItem` leaves both optional (one flat optional shape
 * per row, not a discriminated identity union), so a label-only entry
 * falls back to its `label`, then to its list index — a missing `key`
 * must never surface as a missing React key.
 */
const stableKey = (node: _Item<_AnyNavNode>, index: number): string =>
  getItemId(node) ?? node.label ?? String(index);

/**
 * Renders a single content-tree entry (never an expandable's own row — the
 * caller renders that directly; this is for entries with no `items`): a
 * link (via `Item`, through `LinkComponent`) when `url` is set, otherwise a
 * plain non-navigable label. The content tree accepts nothing else —
 * action buttons are Footer-only, and an expandable's children are the same
 * `LeafNavItem` leaves. Strips the tree-annotation fields (`_Item<T>`:
 * `parentUrl`, `depth`) and the authored `key` — tree identity, applied as
 * the element key (`stableKey`) above; React 19 rejects a `key` inside a
 * spread — then spreads the rest onto `Item`, which consumes
 * `url`/`slot`/`icon`/`disabled` itself rather than leaking them to the
 * DOM. `label` (the authored data field, a plain string) is passed in as
 * `children` — Item composes its content via `children`, not a same-named
 * `label` prop.
 */
const renderEntry = (
  entry: _Item<_AnyNavNode>,
  active: boolean,
  LinkComponent: LinkComponent,
  index: number,
): React.ReactElement => {
  const {
    parentUrl: _parentUrl,
    depth: _depth,
    items: _items,
    key: _key,
    label,
    ...rest
  } = entry;

  return (
    <Item
      key={stableKey(entry, index)}
      {...rest}
      active={active}
      LinkComponent={LinkComponent}
    >
      {label}
    </Item>
  );
};

/**
 * Internal: renders the content tree with two explicit loops (no recursion),
 * deriving active/expanded state from useNavigationTree. Content's renderer
 * (the Footer's flat `FooterRoot` list renders without it).
 *
 *   Loop 1 — root's direct children: each is a SideNavigation.Group
 *     rendered with its optional SideNavigation.GroupHeader.
 *   Loop 2 — a group's entries: each is a leaf row (renderEntry — `Item`: a
 *     link when `url` is set, a plain label otherwise) or a
 *     SideNavigation.ItemExpandable (has `items` — its own children, always
 *     leaves, rendered by a nested loop inside this same pass, through the
 *     same renderEntry).
 *
 * The hook is generic over `_AnyNavNode` (the union of every field any tier
 * can carry — the 24.04 spec §4.3), so `icon`/`slot`/`items` all
 * survive typed onto the annotated nodes regardless of which tier they
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
  // `LeafNavItem` deliberately leaves `key`/`url` both optional (types.ts
  // keeps one flat optional shape per row rather than a discriminated union
  // over variants) — looser than `_AnyNavNode`'s WD405 identity
  // requirement, which `useNavigationTree`'s own `T extends Item` bound
  // needs structurally. The cast trusts that contract rather than
  // tightening the public `NavItem` shape; a label-only entry with neither
  // is safe at render level (element keys fall back via `stableKey`), and
  // identity-bearing data is the documented contract (see `NavGroup.key`).
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
      {/* Loop 1 — root's direct children: groups. */}
      {sections.map((section) => {
        const sectionId = getItemId(section);

        const entries = section.items ?? [];

        return (
          <Fragment key={sectionId}>
            {entries.length > 0 && (
              <Group label={section.label}>
                {/* Loop 2 — a group's entries: leaf rows or expandable items */}
                {entries.map((entry, entryIndex) => {
                  const children = entry.items ?? [];

                  if (children.length > 0) {
                    const {
                      parentUrl: _parentUrl,
                      depth: _depth,
                      items: _items,
                      key: _key,
                      slot: _slot,
                      url: _url,
                      label,
                      ...expandableFields
                    } = entry;
                    return (
                      <ItemExpandable
                        key={stableKey(entry, entryIndex)}
                        {...expandableFields}
                        heading={label}
                        defaultExpanded={
                          nav.getNodeStatus(entry).inSelectedBranch
                        }
                      >
                        {children.map((child, childIndex) =>
                          renderEntry(
                            child,
                            nav.getNodeStatus(child).selected,
                            LinkComponent,
                            childIndex,
                          ),
                        )}
                      </ItemExpandable>
                    );
                  }

                  return renderEntry(
                    entry,
                    nav.getNodeStatus(entry).selected,
                    LinkComponent,
                    entryIndex,
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
