import type React from "react";
import { Icon } from "../../../../component/Icon/index.js";
import type { MarkerProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-marker";

/**
 * Timeline.Marker subcomponent — the graphical element placed on the timeline
 * to represent a point in time. Large carries an image or initials, medium an
 * icon or initials, small is the bare outlined square.
 *
 * @implements ds:global.subcomponent.timeline-event
 */
const Marker = ({
  size = "medium",
  imageUrl,
  alt,
  icon,
  initials,
  customGraphic,
  href,
  label,
  className,
  ...props
}: MarkerProps): React.ReactElement => {
  let graphic: React.ReactNode;
  if (size === "small") {
    // The Figma small marker holds no graphic.
    graphic = null;
  } else if (customGraphic !== undefined) {
    graphic = customGraphic;
  } else if (imageUrl !== undefined) {
    if (!alt && process.env.NODE_ENV !== "production") {
      console.warn(
        "Timeline.Marker: `imageUrl` without `alt` renders a generic user icon instead.",
      );
    }
    graphic = alt ? (
      <img className="image" src={imageUrl} alt={alt} />
    ) : (
      <span className="icon">
        <Icon icon="user" />
      </span>
    );
  } else if (icon !== undefined) {
    graphic = icon;
  } else if (initials !== undefined) {
    graphic = initials;
  } else {
    graphic = (
      <span className="icon">
        <Icon icon="user" />
      </span>
    );
  }

  // The small marker holds no graphic, so it cannot carry a link.
  const showLink = href !== undefined && size !== "small";

  return (
    <span
      className={[componentCssClassName, size, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {showLink ? (
        <a className="link" href={href} aria-label={label ?? alt ?? initials}>
          {graphic}
        </a>
      ) : (
        graphic
      )}
    </span>
  );
};

Marker.displayName = "Timeline.Marker";

export default Marker;
