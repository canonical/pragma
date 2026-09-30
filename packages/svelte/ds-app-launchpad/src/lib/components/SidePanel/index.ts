import { Content, Footer, Header } from "./common/index.js";
import { default as SidePanelRoot } from "./SidePanel.svelte";

const SidePanel = SidePanelRoot as typeof SidePanelRoot & {
  /**
   * `SidePanel.Header` carries the side panel title and a close button, wired to close the SidePanel by default.
   *
   * @example
   * ```svelte
   * <SidePanel.Header>Packages table views</SidePanel.Header>
   * ```
   */
  Header: typeof Header;
  /**
   * `SidePanel.Content` holds the side panel's main information.
   *
   * @example
   * ```svelte
   * <SidePanel.Content>Main content</SidePanel.Content>
   * ```
   */
  Content: typeof Content;
  /**
   * `SidePanel.Footer` holds the side panel's actions.
   *
   * @example
   * ```svelte
   * <SidePanel.Footer>
   *   <Button {...closeProps}>Cancel</Button>
   *   <Button onclick={apply}>Apply</Button>
   * </SidePanel.Footer>
   * ```
   */
  Footer: typeof Footer;
};

SidePanel.Header = Header;
SidePanel.Content = Content;
SidePanel.Footer = Footer;

export type {
  CloseButtonProps as SidePanelHeaderCloseButtonProps,
  ContentProps as SidePanelContentProps,
  FooterProps as SidePanelFooterProps,
  HeaderProps as SidePanelHeaderProps,
} from "./common/index.js";

export * from "./types.js";
export { SidePanel };
