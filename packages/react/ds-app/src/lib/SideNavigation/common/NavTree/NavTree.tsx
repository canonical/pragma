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
 * caller renders that): a link (via `Item`) when `url` is set, otherwise a
 * plain label — the content tree accepts nothing else; action buttons are
 * Footer-only. Strips the tree-annotation fields (`_Item<T>`: `parentUrl`,
 * `depth`) and the authored `key` — tree identity, applied as the element
 * key (`stableKey`) above; React 19 rejects a `key` inside a spread —
 * then spreads the rest onto `Item`, which consumes
 * `url`/`slot`/`icon`/`disabled` itself. `label` is passed as `children`
 * (Item composes via `children`, not a same-named prop).
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
 * Internal: renders the content tree with two explicit loops (no recursion)
 * — loop 1 over root's `Group` children, loop 2 over a group's entries
 * (leaf rows via `renderEntry`, or `ItemExpandable` for entries with
 * `items`, whose always-leaf children render through the same
 * `renderEntry`). Active/expanded state derives from `useNavigationTree`,
 * generic over `_AnyNavNode` so every field stays typed on annotated nodes
 * regardless of tier (SPEC.md §4.3). `currentUrl` seeds initial selection
 * and re-syncs it on navigation (the hook's `initialUrl` is mount-only),
 * keeping the active item — and its `ItemExpandable` ancestors' open state
 * (`inSelectedBranch`) — in sync with the consumer's router.
 */
const NavTree = ({
  root,
  currentUrl,
  LinkComponent = "a",
  className,
  ...props
}: NavTreeProps): React.ReactElement => {
  // `LeafNavItem` keeps `key`/`url` both optional (one flat shape per row,
  // no discriminated union) — looser than `_AnyNavNode`'s WD405 identity
  // requirement, which the hook's `T extends Item` bound needs. The cast
  // trusts that contract rather than tightening the public shape; a
  // label-only entry with neither is safe at render level (element keys
  // fall back via `stableKey`), and identity-bearing data is the
  // documented contract (see `NavGroup.key`).
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
