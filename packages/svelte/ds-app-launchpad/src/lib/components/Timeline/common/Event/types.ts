/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";
import type { UserOptions } from "../../../UserAvatar/index.js";

type BaseProps = SvelteHTMLElements["li"];

export interface EventProps extends BaseProps {
  /**
   * The marker to be displayed over the timeline's line. Can be a user avatar or an icon. If not specified, an "empty" marker will be used.
   */
  marker?: UserOptions | Snippet;
  /**
   * The size of the marker. Has no effect if `marker` is not specified.
   *
   * @default "small"
   */
  markerSize?: "small" | "large";
  /**
   * Content to be displayed in the event's title row. Consider using `<Timeline.Event.TitleRow>`. If you wish to provide other content, and want the marker to be aligned with the first line of text, override `--typography-line-height-timeline-event-title-row` with the line height of your content.
   */
  titleRow?: Snippet;
  /**
   * Content to be displayed in the event's body.
   */
  children?: Snippet;
}
