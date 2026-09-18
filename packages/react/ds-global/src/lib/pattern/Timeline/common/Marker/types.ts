import type { ComponentProps, ReactNode } from "react";
import type { TimelineMarkerSize } from "../../types.js";

type MarkerOwnProps = {
  /** Default "medium". */
  size?: TimelineMarkerSize;
  /** Image marker; requires `alt`. */
  imageUrl?: string;
  alt?: string;
  icon?: ReactNode;
  initials?: string;
  customGraphic?: ReactNode;
  /** Profile URL — wraps the graphic in a link. */
  href?: string;
  /** Accessible name for the link. */
  label?: string;
};

/** Props for the Timeline.Marker subcomponent (native `<span>` root). */
export type MarkerProps = MarkerOwnProps &
  Omit<ComponentProps<"span">, keyof MarkerOwnProps>;
