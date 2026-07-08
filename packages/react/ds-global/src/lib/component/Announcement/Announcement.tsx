import type React from "react";
import { Icon } from "#lib/component/Icon/index.js";
import type { AnnouncementProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds announcement";

/**
 * The announcement is a persistent, high-visibility UI block used to
 * communicate time-sensitive or critical contextual information directly within
 * a page. It is not triggered by specific system or user events; instead, it is
 * a non-transient call-out used for broad organisational updates, compliance
 * warnings, or upcoming deadlines.
 *
 * @implements ds:global.component.announcement
 */
const Announcement = ({
  criticality = "information",
  heading,
  children,
  className,
  ...props
}: AnnouncementProps): React.ReactElement => (
  <div
    className={[componentCssClassName, criticality, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {/* Icon — signals the type of announcement. Shimmed to a single glyph for
        now; per-criticality icons are a later pass. Decorative: the type is
        already conveyed by the heading/content text, not by icon alone. */}
    <span className="icon">
      <Icon icon="information" aria-hidden />
    </span>
    <span className="text">
      {heading != null && <span className="heading">{heading}</span>}
      <span className="content">{children}</span>
    </span>
  </div>
);

export default Announcement;
