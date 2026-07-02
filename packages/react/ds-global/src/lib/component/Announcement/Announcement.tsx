import type React from "react";
import type { AnnouncementProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds announcement";

/**
 * The announcement is a persistent, high-visibility UI block used to
 * communicate time-sensitive or critical contextual information directly within
 * a page. It is not triggered by specific system or user events; instead, it is
 * a non-transient call-out used for broad organizational updates, compliance
 * warnings, or upcoming deadlines.
 *
 * @implements ds:global.component.announcement
 */
const Announcement = ({
  className,
  children,
  ...props
}: AnnouncementProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    role="alert"
    {...props}
  >
    {children}
  </div>
);

export default Announcement;
