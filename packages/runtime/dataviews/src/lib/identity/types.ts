import type { IDENTITY_BRAND } from "./constants.js";

/**
 * An opaque identity token for a DataViews runtime scope.
 *
 * Identities are referential: two tokens are the same identity only when they
 * are the same object. They carry no key, label, or serializable data.
 */
export type Identity = {
  readonly [IDENTITY_BRAND]: true;
};
