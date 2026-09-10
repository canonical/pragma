import { identityBrand } from "./identityBrand.js";

/**
 * An opaque identity token for a DataViews runtime scope.
 *
 * Identities are referential: two tokens are the same identity only when they
 * are the same object. They carry no key, label, or serializable data.
 */
export type Identity = {
  readonly [identityBrand]: true;
};

/**
 * Create a fresh identity token, distinct from every other identity.
 *
 * Identity tokens mark runtime scopes (a provider, a column set, a cell
 * handle) so consumers can enforce, at runtime, that a value created against
 * one scope is not silently consumed by another. Structural copies of a
 * token and forged-key look-alikes are rejected by `isIdentity`.
 */
export default function createIdentity(): Identity {
  // The brand is a non-enumerable own property: spread and Object.assign
  // skip it, and the guard's own-property check rejects Object.create copies.
  const token = {} as Identity;
  Object.defineProperty(token, identityBrand, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(token);
}
