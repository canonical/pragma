import type { HTMLAttributes, ReactNode } from "react";
/**
 * Props for the Announcement component.
 */
export interface AnnouncementProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional CSS class names. */
  className?: string;
  /**
   * Announcement contents.
   */
  children?: ReactNode;
}
