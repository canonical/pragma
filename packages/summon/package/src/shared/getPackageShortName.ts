/**
 * Extract the short name from a package name (removes scope if present).
 *
 * @example
 * getPackageShortName("@canonical/my-package") // "my-package"
 * getPackageShortName("my-package") // "my-package"
 */
export default function getPackageShortName(fullName: string): string {
  const match = fullName.match(/^@[^/]+\/(.+)$/);
  return match?.[1] ?? fullName;
}
