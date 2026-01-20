import type React from "react";
import type { EventProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-event";

/**
 * Timeline.Event subcomponent
 *
 * A single event in the timeline, with optional actor and datetime.
 * DOM order per DSL: [0] actor, [1] datetime, [2] payload
 *
 * @implements ds:global.subcomponent.timeline-event
 */
const Event = ({
  actor,
  datetime,
  children,
  criticality,
  className,
  ...props
}: EventProps): React.ReactElement => (
  <div
    className={[componentCssClassName, criticality, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {/* Timeline marker/dot */}
    <div className="marker" aria-hidden="true" />

    {/* Event content container */}
    <div className="content">
      {/* edges[0]: actor (cardinality: 0..1) */}
      {actor && <div className="actor">{actor}</div>}

      {/* edges[1]: datetime (cardinality: 0..1) */}
      {datetime && <time className="datetime">{datetime}</time>}

      {/* edges[2]: payload (cardinality: 1, slotName: default) */}
      <div className="payload">{children}</div>
    </div>
  </div>
);

Event.displayName = "Timeline.Event";

export default Event;
