import type { IDENTITY_BRAND } from "./constants.js";

/**
 * An opaque identity token for a DataViews runtime scope.
 *
 * Identities are referential: two tokens are the same identity only when they
 * are the same object. They carry no key, label, or serializable data.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Identity = {
  readonly [IDENTITY_BRAND]: true;
};
