/* @canonical/generator-ds 0.10.0-experimental.2 */

import { DialogContent } from "../common/index.js";
import { default as SidePanelRoot } from "./SidePanel.svelte";

const SidePanel = SidePanelRoot as typeof SidePanelRoot & {
  /**
   * `SidePanel.Content` is a layout component that provides a structured container for the side panel's content.
   *
   * @example
   * ```svelte
   * <SidePanel.Content>
   *   <SidePanel.Content.Header>
   *     SidePanel Header
   *     <SidePanel.Content.Header.CloseButton {commandfor} command="close" />
   *   </SidePanel.Content.Header>
   *   <SidePanel.Content.Body>
   *     Main Content
   *   </SidePanel.Content.Body>
   *   <SidePanel.Content.Footer>
   *     <Button>Footer Button</Button>
   *   </SidePanel.Content.Footer>
   * </SidePanel.Content>
   * ```
   */
  Content: typeof DialogContent & {
    /**
     * `SidePanel.Content.Header` represents the header section of the side panel.
     *
     * @example
     * ```svelte
     * <SidePanel.Content.Header>
     *   Header Content
     *   <SidePanel.Content.Header.CloseButton {commandfor} command="close" />
     * </SidePanel.Content.Header>
     * ```
     */
    Header: typeof DialogContent.Header & {
      /**
       * `SidePanel.Content.Header.CloseButton` is a wrapper over `Button` meant to be used as a close button in side panel headers.
       *
       * @example
       * ```svelte
       * <SidePanel.Content.Header.CloseButton {commandfor} command="close" />
       * ```
       */
      CloseButton: typeof DialogContent.Header.CloseButton;
    };
    /**
     * `SidePanel.Content.Body` represents the main content area of the side panel.
     *
     * @example
     * ```svelte
     * <SidePanel.Content.Body>
     *   Main Content
     * </SidePanel.Content.Body>
     * ```
     */
    Body: typeof DialogContent.Body;
    /**
     * `SidePanel.Content.Footer` represents the footer section of the side panel. Usually contains action buttons.
     *
     * @example
     * ```svelte
     * <SidePanel.Content.Footer>
     *   <Button>Cancel</Button>
     *   <Button>Confirm</Button>
     * </SidePanel.Content.Footer>
     * ```
     */
    Footer: typeof DialogContent.Footer;
  };
};

SidePanel.Content = DialogContent;

export * from "./types.js";
export { SidePanel };
