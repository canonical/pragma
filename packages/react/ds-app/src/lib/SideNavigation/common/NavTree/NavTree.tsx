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
 * Renders a single content-tree entry (never an expandable's own row — the
 * caller renders that): a link (via `Item`) when `url` is set, otherwise a
 * plain label — the content tree accepts nothing else; action buttons are
 * Footer-only. Strips the tree-annotation fields (`_Item<T>`: `parentUrl`,
 * `depth`) and the authored `key` — tree identity, applied as the element
 * key above; React 19 rejects a `key` inside a spread — then spreads the
 * rest onto `Item`, which consumes `url`/`slot`/`icon`/`disabled` itself.
 * `label` is passed as `children` (Item composes via `children`, not a
 * same-named prop).
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
    key: _key,
    label,
    ...rest
  } = entry;

  return (
    <Item key={entryId} {...rest} active={active} LinkComponent={LinkComponent}>
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
  // trusts that contract rather than tightening the public shape.
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
                {entries.map((entry) => {
                  const entryId = getItemId(entry);
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
