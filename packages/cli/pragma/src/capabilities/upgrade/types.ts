/**
 * Data shape for `pragma upgrade`.
 */

import type { InstallKind } from "../../kernel/render/vocabulary.js";

/** The outcome of an upgrade run (or its plan). */
export interface UpgradeData {
  /** The install-source label (e.g. `bun (global)`). */
  readonly pm: string;
  /** The install-source state behind the label. */
  readonly kind: InstallKind;
  /** The currently-installed version. */
  readonly current: string;
  /** The latest published version, or `undefined` when offline. */
  readonly latest: string | undefined;
  /** The package-manager command that applies the update — only for a GLOBAL
   * install; every other state carries {@link guidance} instead. */
  readonly command?: string;
  /** The honest sentence for an install with no sanctioned update command
   * (linked / ephemeral / workspace / unknown). */
  readonly guidance?: string;
  /** True when the registry could not be reached. */
  readonly offline: boolean;
  /** True when the installed version is already the latest. */
  readonly alreadyLatest: boolean;
  /** True when the update command was actually executed (a real run). */
  readonly executed: boolean;
}
