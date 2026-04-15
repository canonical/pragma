/* @canonical/generator-ds 0.9.0-experimental.22 */

import type { HTMLAttributes } from "svelte/elements";

export type UserOptions = {
  /** The user's name */
  userName?: string;
  /** The URL of the user's avatar image */
  userAvatarUrl?: string;
};

export interface UserAvatarProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    UserOptions {
  size?: "small" | "medium" | "large";
  /** The alt text for the avatar image, if available */
  alt?: string;
}
