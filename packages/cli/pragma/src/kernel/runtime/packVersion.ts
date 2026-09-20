/**
 * Is a built pack older than the CLI that is now reading it?
 *
 * A pack's `manifest.json` records the version of the CLI that built it (the
 * `version` field — see `graphpack/types.Manifest`). When a user upgrades, the
 * new CLI ships a new embedded snapshot, and a pack built by the OLD CLI weeks
 * ago is no longer the better of the two: it answered every read from a graph
 * the upgrade was meant to replace, silently, with nothing in `sources status`
 * to say so. This module is the comparison that ends that — `resolveSources`
 * uses it to let the embedded snapshot answer instead (see its decision table).
 *
 * A LEAF on the storeless fast path: string arithmetic, no imports at all. It
 * deliberately does NOT depend on a semver library — the comparison is
 * major/minor/patch on two strings that both come from a `package.json`
 * `version`, and the fast path pays for every value import it makes.
 */

/** A parsed `major.minor.patch` triple. */
type Semver = readonly [major: number, minor: number, patch: number];

/**
 * Parse the `major.minor.patch` prefix of a version string.
 *
 * A pre-release or build suffix (`1.2.3-rc.1`, `1.2.3+sha`) parses to its
 * release triple: the suffix orders two builds of the SAME release, and this
 * comparison only ever asks which release is older.
 *
 * @param value - The recorded version string.
 * @returns The triple, or `undefined` when the string is not a version.
 */
export function parseSemver(value: string): Semver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
  if (match === null) return undefined;
  const [, major, minor, patch] = match as unknown as [
    string,
    string,
    string,
    string,
  ];
  return [Number(major), Number(minor), Number(patch)];
}

/**
 * Whether a pack built by `packVersion` predates the CLI at `cliVersion`.
 *
 * Deliberately conservative — it answers `true` only when the pack is PROVABLY
 * older, because answering `true` means overriding a store the user built on
 * purpose:
 *
 * - Equal, or a pack built by a NEWER CLI (a downgrade, or two CLIs sharing one
 *   cache): keep the built pack. The user's own build wins, exactly as today.
 * - `cliVersion` unparseable, or `0.0.0` (a dev build, whose version says
 *   nothing about how its snapshot compares): keep the built pack, and say
 *   nothing about it — a local checkout must not start reporting every pack on
 *   the machine as stale.
 * - `packVersion` unparseable: keep the built pack. The notice a user reads
 *   names the version that built the pack, so a pack we cannot name is one we
 *   cannot honestly call old. (No released CLI writes such a manifest —
 *   `version` comes from `package.json` — and a manifest MISSING the field is
 *   already not a readable pack at all: `validateManifest` requires it, so the
 *   directory fails the completeness gate and boot reports the ordinary
 *   "not built" recovery.)
 *
 * @param packVersion - The manifest's `version` (the CLI that built the pack).
 * @param cliVersion - The running CLI's version.
 * @returns Whether the pack should yield to the running CLI's snapshot.
 */
export function packIsOlderThanCli(
  packVersion: string,
  cliVersion: string,
): boolean {
  const cli = parseSemver(cliVersion);
  if (cli === undefined || (cli[0] === 0 && cli[1] === 0 && cli[2] === 0)) {
    return false;
  }
  const pack = parseSemver(packVersion);
  if (pack === undefined) return false;
  for (let index = 0; index < 3; index++) {
    const packPart = pack[index] as number;
    const cliPart = cli[index] as number;
    if (packPart !== cliPart) return packPart < cliPart;
  }
  return false;
}
