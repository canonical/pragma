import type React from "react";
import { Tab } from "./common/index.js";
import type { TabsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds tabs";

/**
 * A tabs component organises related content into separate sections, letting
 * users move between them by selecting labelled tab headers. This navigational
 * variant renders each `Tabs.Tab` as a link (via its `LinkComponent`, default
 * `"a"`), so tabs are deep-linkable and drive the active section from the URL;
 * the consumer owns what each tab points at.
 *
 * `import { Tabs } from "@canonical/react-ds-global";`
 *
 * @implements dso:global.component.tabs
 */
const Tabs = ({
  children,
  className,
  listClassName,
  ...props
}: TabsProps): React.ReactElement => (
  <nav
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    <ul className={["tabs-list", listClassName].filter(Boolean).join(" ")}>
      {children}
    </ul>
  </nav>
);

Tabs.Tab = Tab;

export default Tabs;
