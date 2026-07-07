/**
 * The published package name, used in generator `displayName` labels.
 *
 * Kept as a plain constant rather than a `package.json` JSON import: the import
 * path (`../../package.json`) is relative to the source file, but after the
 * `src → dist/esm` build it would resolve one level too shallow (`dist/` instead
 * of the package root), breaking at runtime under Node. A constant sidesteps the
 * build-layout coupling entirely.
 */
export const PACKAGE_NAME = "@canonical/summon-component";
