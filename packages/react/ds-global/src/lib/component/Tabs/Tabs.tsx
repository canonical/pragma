import type React from "react";
import { Item } from "./common/index.js";
import type { TabsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tabs";

/**
 * A tabs component organises related content into separate sections, letting
 * users move between them by selecting labelled tab headers. This navigational
 * variant is data-driven: it takes a `navigationRoot` item and renders its
 * direct children as tabs, each a link (via `LinkComponent`, default `"a"`), so
 * tabs are deep-linkable and drive the active section from the URL; the
 * consumer owns what each tab points at.
 *
 * `import { Tabs } from "@canonical/react-ds-global";`
 *
 * @implements dso:global.component.tabs
 */
const Tabs = ({
  navigationRoot,
  LinkComponent = "a",
  currentUrl,
  className,
  listClassName,
  ...props
}: TabsProps): React.ReactElement => {
  // Only the root's direct children are rendered (the root is a container).
  const items = navigationRoot.items ?? [];
  return (
    <nav
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      <ul className={["tabs-list", listClassName].filter(Boolean).join(" ")}>
        {items.map((item) => (
          <Item
            key={item.key ?? item.url ?? item.label}
            item={item}
            active={item.url != null && item.url === currentUrl}
            LinkComponent={LinkComponent}
          />
        ))}
      </ul>
    </nav>
  );
};

export default Tabs;
