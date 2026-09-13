import { IDENTITY_BRAND } from "./constants.js";
import type { Identity } from "./types.js";

/**
 * Check whether an unknown value is a DataViews identity token.
 *
 * Accepts tokens created by `createIdentity` and rejects structural copies
 * and forged-key look-alikes: spread and Object.assign drop the
 * non-enumerable brand, the own-property check rejects prototype copies,
 * and forged symbols fail on symbol identity.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function isIdentity(value: unknown): value is Identity {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.hasOwn(value, IDENTITY_BRAND)
  );
}
