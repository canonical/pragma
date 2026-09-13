import { IDENTITY_BRAND } from "./constants.js";
import type { Identity } from "./types.js";

/**
 * Create a fresh identity token, distinct from every other identity.
 *
 * Identity tokens mark runtime scopes (a provider, a column set, a cell
 * handle) so consumers can enforce, at runtime, that a value created against
 * one scope is not silently consumed by another. Structural copies of a
 * token and forged-key look-alikes are rejected by `isIdentity`.
 *
 * @note Impure: every call mints a new object, and two calls never return
 * the same token; that is what makes a token an identity.
 */
export default function createIdentity(): Identity {
  // The brand is a non-enumerable own property: spread and Object.assign
  // skip it, and the guard's own-property check rejects Object.create copies.
  const token = {} as Identity;
  Object.defineProperty(token, IDENTITY_BRAND, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(token);
}
