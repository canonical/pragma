/**
 * Default semantic graph package registry.
 *
 * Sourced from the declarative built-in defaults document
 * (`src/config/defaults.json`) — pragma core carries no hardcoded
 * knowledge of specific design-system packages. These form the base
 * package set whenever a config layer does not declare a non-empty
 * `packages` list; global `refs.json` entries then merge over them by
 * package name, and a non-empty config list replaces them entirely
 * (see `mergeAndParseRefs`).
 *
 * Resolution is handled by the loader chain in `loaders/`.
 */

import { DEFAULT_CONFIG } from "../../config/defaultConfig.js";
import type { RawPackageEntry } from "../refs/operations/parseRef.js";

/** Default semantic graph packages loaded when no config overrides are present. */
export const DEFAULT_PACKAGES: readonly RawPackageEntry[] =
  DEFAULT_CONFIG.packages;
