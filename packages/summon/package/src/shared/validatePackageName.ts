import getPackageShortName from "./getPackageShortName.js";

/**
 * Validate npm package name.
 * Supports scoped packages (@scope/name) and unscoped packages.
 * Rules: lowercase, can contain hyphens, can't start/end with hyphen.
 */
export default function validatePackageName(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return "Package name is required";
  }

  const name = getPackageShortName(value);

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(name)) {
    return "Package name must be lowercase, can contain hyphens, but cannot start or end with a hyphen";
  }

  if (value.length > 214) {
    return "Package name cannot be longer than 214 characters";
  }

  return true;
}
