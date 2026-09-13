import { PROVIDER_HOSTS } from "./constants.js";

/**
 * Whether a value is a provider this package built: registered with its
 * host by the factory. A structural copy — a spread, an object assembled
 * by hand — is not one, whatever its shape says. What a root checks before
 * it mounts a provider it was handed. A check, not a narrowing: a caller
 * holds a provider typed over its own collection, which no default-typed
 * predicate could hand back.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function isDataViewsProvider(value: unknown): boolean {
  return (
    typeof value === "object" && value !== null && PROVIDER_HOSTS.has(value)
  );
}
