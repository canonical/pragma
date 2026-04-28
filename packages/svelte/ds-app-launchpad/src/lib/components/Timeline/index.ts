/* @canonical/generator-ds 0.10.0-experimental.2 */

import { Event, HiddenEvents } from "./common/index.js";
import { default as TimelineRoot } from "./Timeline.svelte";

const Timeline = TimelineRoot as typeof TimelineRoot & {
  /**
   * `Timeline.Event` is a component that represents a single event on the timeline. It displays a marker that can optionally show an icon or an avatar (both can either be `small` or `large`).
   *
   * The marker and the first line of the optional `titleRow` are meant to be aligned vertically. This is automatically handled if `<Timeline.Event.TitleRow>` is used. If you wish to provide other content and want this behavior to persist, override `--typography-line-height-timeline-event-title-row` CSS variable with the line height of your content.
   * @example
   * ```svelte
   * <Timeline.Event marker={{ userName: "Alvarez Daniella" }} markerSize="small">
   *   {#snippet titleRow()}
   *     <Timeline.Event.TitleRow
   *       leadingText="Alvarez Daniella"
   *     >
   *       did something
   *       {#snippet date()}
   *         <DateTime date="2023-03-15" />
   *       {/snippet}
   *     </Timeline.Event.TitleRow>
   *   {/snippet}
   *   and here is some additional content.
   * </Timeline.Event>
   * ```
   */
  Event: typeof Event;
  /**
   * `Timeline.HiddenEvents` component provides a way to inform the user, that not all events are visible in the timeline. It displays a message indicating the number of events hidden from the view and optionally allows the user to display more or all the hidden events.
   * @example
   * ```svelte
   * <Timeline.HiddenEvents numHidden={888}>
   *   <Timeline.HiddenEvents.Link href="?showAll">Show all</Timeline.HiddenEvents.Link>
   * </Timeline.HiddenEvents>
   * ```
   */
  HiddenEvents: typeof HiddenEvents;
};

Timeline.Event = Event;
Timeline.HiddenEvents = HiddenEvents;

export type {
  EventProps as TimelineEventProps,
  HiddenEventsLinkProps as TimelineHiddenEventsLinkProps,
  HiddenEventsProps as TimelineHiddenEventsProps,
  TitleRowProps as TimelineTitleRowProps,
} from "./common/index.js";
export * from "./types.js";
export { Timeline };
