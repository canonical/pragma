import getPackageShortName from "./getPackageShortName.js";

/**
 * Validate npm package name.
 * Supports scoped packages (@scope/name) and unscoped packages.
 * Rules: lowercase, can contain hyphens, can't start/end with hyphen.
 */
const KEBAB = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;

export default function validatePackageName(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return "Package name is required";
  }

  if (value.startsWith("@")) {
    // npm rejects scopes that are not lowercase URL-safe strings; hold the
    // scope to the same kebab-case rule as the short name.
    const scope = /^@([^/]*)\//.exec(value)?.[1];
    if (scope === undefined) {
      return "Scoped package name must look like @scope/name";
    }
    if (!KEBAB.test(scope)) {
      return "Package scope must be lowercase, can contain hyphens, but cannot start or end with a hyphen";
    }
  }

  const name = getPackageShortName(value);

  if (!KEBAB.test(name)) {
    return "Package name must be lowercase, can contain hyphens, but cannot start or end with a hyphen";
  }

  if (value.length > 214) {
    return "Package name cannot be longer than 214 characters";
  }

  return true;
}
