import type { HTMLAttributes, ReactElement } from "react";
import type { TabProps } from "./common/Tab/types.js";

export type { TabProps };

/**
 * Props for the Tabs component
 *
 * @implements dso:global.component.tabs
 */
export interface TabsProps extends HTMLAttributes<HTMLElement> {
  /** The tabs, as `Tabs.Tab` elements. */
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
  /** Class applied to the `<ul>` tab list. */
  listClassName?: string;
  /**
   * Accessible name for the navigation landmark. Required so assistive tech can
   * distinguish this tab strip from other navigation regions.
   */
  "aria-label": string;
}

/**
 * Tabs component type with the Tab subcomponent attached.
 */
export type TabsComponent = ((props: TabsProps) => ReactElement) & {
  Tab: (props: TabProps) => ReactElement;
};
