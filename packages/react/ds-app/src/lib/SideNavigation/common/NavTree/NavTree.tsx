import type { _Item } from "@canonical/ds-types";
import { useNavigationTree } from "@canonical/react-hooks";
import { getItemId } from "@canonical/utils";
import type React from "react";
import { useEffect } from "react";
import { Item } from "../Item/index.js";
import type { NavTreeProps } from "./types.js";

/**
 * Internal: walks a WD405 navigation tree and renders each node via the default
 * Item renderer, deriving active state from useNavigationTree. Shared by Content
 * and Footer — each region drives its own hook instance over its own root.
 *
 * The hook is only invoked here (where a `root` is guaranteed), keeping
 * Content/Footer free to fall back to plain children. Item stays presentational;
 * NavTree owns traversal and status.
 *
 * `currentUrl` seeds the initial selection and re-syncs it on navigation: the
 * hook's `initialUrl` is mount-only, so an effect re-selects the matching item
 * whenever `currentUrl` changes, keeping the active state in sync with the
 * consumer's router.
 */
const NavTree = ({
  root,
  currentUrl,
  LinkComponent = "a",
}: NavTreeProps): React.ReactElement => {
  const nav = useNavigationTree({ root, initialUrl: currentUrl });
  const { index, selectItem } = nav;

  useEffect(() => {
    if (currentUrl === undefined) return;
    const match = index[currentUrl];
    if (match) selectItem(match);
  }, [currentUrl, index, selectItem]);

  const renderList = (items: _Item[] | undefined): React.ReactNode =>
    items?.length ? (
      <ul className="nav-item-list">
        {items.map((item) => {
          const { selected } = nav.getNodeStatus(item);
          return (
            <Item
              key={getItemId(item)}
              {...item}
              active={selected}
              depth={item.depth}
              LinkComponent={LinkComponent}
            >
              {renderList(item.items)}
            </Item>
          );
        })}
      </ul>
    ) : null;

  return <>{renderList(nav.annotatedRoot.items)}</>;
};

export default NavTree;
