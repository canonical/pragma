/**
 * Data shape for `pragma upgrade`.
 */

/** The outcome of an upgrade run (or its plan). */
export interface UpgradeData {
  /** The install-source label (e.g. `bun (global)`). */
  readonly pm: string;
  /** The currently-installed version. */
  readonly current: string;
  /** The latest published version, or `undefined` when offline. */
  readonly latest: string | undefined;
  /** The package-manager command that applies the update. */
  readonly command: string;
  /** True when the registry could not be reached. */
  readonly offline: boolean;
  /** True when the installed version is already the latest. */
  readonly alreadyLatest: boolean;
  /** True when the update command was actually executed (a real run). */
  readonly executed: boolean;
}
