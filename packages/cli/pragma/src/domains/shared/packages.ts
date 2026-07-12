/**
 * Default semantic graph package registry.
 *
 * Sourced from the declarative built-in defaults document
 * (`src/config/defaults.json`) — pragma core carries no hardcoded
 * knowledge of specific design-system packages. Loaded when no config
 * layer or global refs declare packages; global `refs.json` entries
 * merge over these by package name (see `mergeAndParseRefs`).
 *
 * Resolution is handled by the loader chain in `loaders/`.
 */

import { DEFAULT_CONFIG } from "../../config/defaultConfig.js";
import type { RawPackageEntry } from "../refs/operations/parseRef.js";

/** Default semantic graph packages loaded when no config overrides are present. */
export const DEFAULT_PACKAGES: readonly RawPackageEntry[] =
  DEFAULT_CONFIG.packages;
