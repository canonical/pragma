import type React from "react";
import { resolveMarkerSize } from "../../utils/markerCombination.js";
import { DateTime } from "../DateTime/index.js";
import { Marker } from "../Marker/index.js";
import type { EventProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-event";

/**
 * Timeline.Event subcomponent — a single timeline event, with every
 * derivation (actor fallback, show* flags, marker merge, dateTime wiring)
 * inside the component.
 *
 * `import { Timeline } from "@canonical/ds-global";`
 *
 * @implements ds:global.subcomponent.timeline-event
 */
const Event = ({
  item,
  markerSize,
  dateTime,
  datetimePosition = "trailing",
  className,
  ...props
}: EventProps): React.ReactElement => {
  const actor =
    item.showName === false ? undefined : (item.actorName ?? item.actorId);
  const actorNode =
    actor === undefined ? null : item.actorLink ? (
      <a className="actor" href={item.actorLink}>
        {actor}
      </a>
    ) : (
      <span className="actor">{actor}</span>
    );

  const formatted = dateTime ? dateTime.format(item.dateTime) : undefined;
  const datetimeNode =
    dateTime && item.showDateTime !== false && formatted ? (
      <DateTime
        iso={item.dateTime}
        alternate={formatted.alternate}
        showTooltip={dateTime.tooltip}
        toggleable={dateTime.toggleable}
        pressed={dateTime.pressed}
        onToggle={dateTime.onToggle}
      >
        {formatted.display}
      </DateTime>
    ) : null;

  const payloadNode =
    item.showDescription === false || item.description === undefined ? null : (
      <div className="payload">{item.description}</div>
    );

  /* `leading` gives the dateTime its own column before the marker;
     `trailing` keeps it at the end of the content row. */
  const rowDatetime = datetimePosition === "leading" ? null : datetimeNode;

  const markerProps = {
    size: resolveMarkerSize(item, markerSize),
    ...item.marker,
  };
  const markerNode = (
    <Marker
      {...markerProps}
      href={item.actorLink}
      label={item.actorName ?? item.actorId}
    />
  );

  return (
    <div
      className={[componentCssClassName, item.criticality, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {datetimePosition === "leading" ? datetimeNode : null}

      {/* The marker carries its own accessible name when linked */}
      <div className="marker">{markerNode}</div>

      {item.fullyCustom ? (
        /* Default content block hidden; only marker + custom content render */
        <div className="custom full">
          {item.customContent ?? item.description}
        </div>
      ) : (
        <div className="content">
          {actorNode || rowDatetime || payloadNode ? (
            <div className="default-row">
              {/* Figma "Default" row: name, then description, then the
                  trailing dateTime; the leading one sits before the marker. */}
              {actorNode}
              {payloadNode}
              {rowDatetime}
            </div>
          ) : null}
          {item.customContent === undefined ? null : (
            <div className="custom">{item.customContent}</div>
          )}
        </div>
      )}
    </div>
  );
};

Event.displayName = "Timeline.Event";

export default Event;
