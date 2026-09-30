import type { ICON_CATEGORIES, ICON_NAMES } from "./constants.js";

export type IconName = (typeof ICON_NAMES)[number];

export type IconCategory = (typeof ICON_CATEGORIES)[number];

/** An icon on its way out, and what to reach for instead. */
export interface IconDeprecation {
  /** The icon to use instead, e.g. `"delete"`. */
  readonly replacedBy?: IconName;

  /** The package version the icon was deprecated in, e.g. `"0.38.0"`. */
  readonly since?: string;
}

/** Searchable information about a single icon. */
export interface IconMetadata {
  /**
   * Lowercase words someone might search for, e.g. `"trash"` and `"bin"` on
   * `delete`. A tag may be a phrase (`"magnifying glass"`), and is never the
   * icon's own name. At least three, enforced by the test suite.
   */
  readonly tags: readonly string[];

  /**
   * The groups the icon belongs to, in `ICON_CATEGORIES` order, e.g.
   * `["action", "product"]`. At least one.
   */
  readonly categories: readonly IconCategory[];

  /**
   * Names the icon was previously published under, so a search for a legacy
   * name still finds it, e.g. `"unstarred"` on `starred-off`. Unique across
   * the whole set, and never the name of a live icon.
   */
  readonly aliases?: readonly string[];

  /**
   * One line explaining what the icon depicts or means, e.g.
   * `"Units of a deployed application."` Carried by every `product` and
   * `theme` icon, and by any icon whose name does not say what it depicts.
   */
  readonly description?: string;

  /** Present only while the icon is on its way out. */
  readonly deprecated?: IconDeprecation;
}
