/* @canonical/generator-ds 0.17.1 */

import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";
import type { SvelteHTMLElements } from "svelte/elements";
import type { PositionArea } from "../../useFunctions/usePositionArea.svelte.js";

type BaseProps = SvelteHTMLElements["div"];

export type TooltipTriggerProps = {
  "aria-describedby": string;
  [key: symbol]: Attachment<HTMLElement>;
};

export interface TooltipProps extends BaseProps {
  /**
   * Elements that trigger the tooltip when hovered or focused.
   *
   * Snippet arguments:
   * - `triggerProps`: Props that should be spread on the trigger element to make it control the tooltip:
   *   - `aria-describedby`: The id of the tooltip element. Setting this attribute on the trigger element enables assistive technologies to associate the tooltip with the trigger;
   *   - attachments allow the tooltip to listen to events on the trigger element (hover, focus) and position the tooltip relative to the trigger element.
   */
  trigger: Snippet<[triggerProps: TooltipTriggerProps]>;
  /**
   * Content to be displayed inside the tooltip. It should not contain interactive elements (see: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
   */
  children: Snippet<[]>;
  /**
   * Tooltip position. This is a subset of valid CSS [<position-area>](https://developer.mozilla.org/en-US/docs/Web/CSS/position-area) keyword combinations.
   *
   * @default "block-start"
   */
  position?: PositionArea;
  /**
   * If set to true, the tooltip will try to find an alternative position if the preferred position does not fit in the viewport.
   *
   * @default true
   */
  autoAdjust?: boolean;
  /**
   * Delay in milliseconds before showing the tooltip after the user hovers or focuses the trigger element.
   *
   * @default 350
   */
  delay?: number;
}
