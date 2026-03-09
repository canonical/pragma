/**
 * String transformation utilities
 *
 * Pure functions that transform package names.
 * All exports share the same shape: (string) => string.
 */

/**
 * Extract the short name from a package name (removes scope if present)
 * @canonical/my-package -> my-package
 * my-package -> my-package
 */
export const getPackageShortName = (fullName: string): string => {
  const match = fullName.match(/^@[^/]+\/(.+)$/);
  return match ? match[1] : fullName;
};
