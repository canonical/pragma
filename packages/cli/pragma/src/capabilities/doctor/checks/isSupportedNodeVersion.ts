/**
 * Whether a Node.js version satisfies the range this package declares in its
 * own `engines.node`, surfaced as `SUPPORTED_NODE_RANGE` in `constants.ts`.
 *
 * The range is expressed here as a comparison rather than parsed: the CLI
 * carries no semver dependency, and one range does not justify a range parser.
 * What keeps the two honest is `isSupportedNodeVersion.test.ts`, which builds an
 * independent predicate straight from the declared range string and requires
 * the two to agree across a version grid — so a change to `engines.node` that
 * is not mirrored here fails the suite rather than shipping.
 *
 * A major-only comparison cannot express this range: it cannot say "22.18 but
 * not 22.0", and it cannot exclude the 23.0–23.5 window.
 *
 * @param version - A Node version string, e.g. `process.versions.node`.
 * @returns Whether the version falls inside the declared range.
 */
export function isSupportedNodeVersion(version: string): boolean {
  const [rawMajor, rawMinor] = version.split(".");
  const major = Number(rawMajor);
  const minor = Number(rawMinor);

  if (!Number.isInteger(major) || !Number.isInteger(minor)) return false;
  if (major < 22) return false;
  if (major === 22) return minor >= 18;
  if (major === 23) return minor >= 6;
  return true;
}
