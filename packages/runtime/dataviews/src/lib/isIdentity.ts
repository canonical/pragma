import type { Identity } from "./createIdentity.js";
import { identityBrand } from "./identityBrand.js";

/**
 * Check whether an unknown value is a DataViews identity token.
 *
 * Accepts tokens created by `createIdentity` and rejects structural copies
 * and forged-key look-alikes: spread and Object.assign drop the
 * non-enumerable brand, the own-property check rejects prototype copies,
 * and forged symbols fail on symbol identity.
 */
export default function isIdentity(value: unknown): value is Identity {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.hasOwn(value, identityBrand)
  );
}
