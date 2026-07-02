import type React from "react";
import { Content, Event } from "./common/index.js";
import type { TimelineProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline";

/**
 * The timeline component establishes a clear order of operations. It is a
 * structural UI block used to represent a chronological list of events,
 * actions, or milestones in a vertical sequence. It serves as a visual
 * narrative, allowing users to track progress, audit history, or understand
 * the relationship between time and specific activities at a glance. Each
 * event can include a dateTime, actor, description, and other custom content.
 * It also includes an optional control bar for users to filter or sort the
 * events.
 *
 * @implements ds:global.pattern.timeline
 */
const Timeline = ({
  children,
  className,
  ...props
}: TimelineProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* DSL edges order: [0] Header (not impl), [1] Content, [2] Footer (not impl) */}
    {children}
  </div>
);

Timeline.Content = Content;
Timeline.Event = Event;

export default Timeline;
