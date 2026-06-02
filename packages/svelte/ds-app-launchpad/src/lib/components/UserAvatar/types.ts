/* @canonical/generator-ds 0.9.0-experimental.22 */

import type { HTMLAttributes, HTMLImgAttributes } from "svelte/elements";

type ImageOnlyAttributes = Omit<
  HTMLImgAttributes,
  | keyof HTMLAttributes<HTMLElement>
  | "bind:naturalWidth"
  | "bind:naturalHeight"
  | "children"
  | "src" // userAvatarUrl maps to src
>;

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
  /**
   * `<img>`-specific attributes (e.g. `alt`, `loading`, `fetchpriority`) for the avatar image.
   * Only applied when the avatar renders as an image — i.e. `userAvatarUrl` is set and the image has not failed to load.
   */
  imageAttributes?: ImageOnlyAttributes;
}
