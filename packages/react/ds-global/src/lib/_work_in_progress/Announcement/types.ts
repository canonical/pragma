import type { ModifierFamily } from "@canonical/ds-types";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * Criticality modifier — the type of announcement. Drives the icon,
   * side-bar colour, background, and text treatment via the criticality
   * modifier family. Defaults to `"information"`.
   * - `"information"`: neutral, informative (default)
   * - `"success"`: positive status
   * - `"warning"`: cautionary status
   * - `"error"`: negative status
   */
  criticality?: ModifierFamily<"criticality">;

  /** Optional heading — the subject of the announcement. */
  heading?: ReactNode;

  /** The announcement body — its detailed content. */
  children: ReactNode;
};

/**
 * Props for the `Announcement` component.
 */
export type AnnouncementProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
