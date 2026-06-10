import { useNavigationTree } from "@canonical/react-hooks";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { useEffect } from "react";
import type { NavItem } from "../../types.js";
import { Item } from "../Item/index.js";
import type { NavTreeProps } from "./types.js";
import "./styles.css";

/**
 * Internal: renders a navigation tree with two explicit loops (no recursion),
 * deriving active state from useNavigationTree. Shared by Content and Footer —
 * each region drives its own hook instance over its own root.
 *
 *   Loop 1 — level-1 groups: each direct child of the root is a group; its
 *     label renders as a header (omitted when absent), wrapping its items.
 *   Loop 2 — level-2 items: each child of a group maps to a (flat) Item.
 *
 * The hook is generic over NavItem, so `icon`/`slot` survive typed onto the
 * annotated nodes. `currentUrl` seeds initial selection and re-syncs it on
 * navigation (the hook's `initialUrl` is mount-only), so the active item stays
 * in sync with the consumer's router.
 */
const NavTree = ({
  root,
  currentUrl,
  LinkComponent = "a",
}: NavTreeProps): React.ReactElement => {
  const nav = useNavigationTree<NavItem>({ root, initialUrl: currentUrl });
  const { index, selectItem } = nav;

  useEffect(() => {
    if (currentUrl === undefined) return;
    const match = index[currentUrl];
    if (match) selectItem(match);
  }, [currentUrl, index, selectItem]);

  const groups = nav.annotatedRoot.items ?? [];

  return (
    <div className="ds nav-tree">
      {/* Loop 1 — level-1 groups */}
      {groups.map((group) => {
        const groupId = getItemId(group);
        const items = group.items ?? [];
        return (
          <section className="group" key={groupId} data-depth={group.depth}>
            {group.label ? (
              <span className="header p">{group.label}</span>
            ) : null}
            <ul className="list">
              {/* Loop 2 — level-2 items */}
              {items.map((item) => (
                <Item
                  key={getItemId(item)}
                  {...item}
                  active={nav.getNodeStatus(item).selected}
                  LinkComponent={LinkComponent}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default NavTree;
