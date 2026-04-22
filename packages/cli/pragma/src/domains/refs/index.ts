/** @module Refs domain — package reference resolution and update-refs command. */

import type { CommandDefinition } from "@canonical/cli-core";
import updateRefsCommand from "./commands/updateRefs.js";

/**
 * Return all refs command definitions.
 * Store-skip domain — does not require a booted ke store.
 */
export function commands(): CommandDefinition[] {
  return [updateRefsCommand];
}

export type { PackageRef, RawPackageEntry } from "./operations/parseRef.js";
export { parsePackageEntry } from "./operations/parseRef.js";
export { cacheRoot, gitCacheDir, globalConfigDir } from "./operations/paths.js";
export { default as readGlobalRefs } from "./operations/readGlobalRefs.js";
export type {
  UpdateRefsOptions,
  UpdateResult,
} from "./operations/updateRefs.js";
export { default as updateRefs } from "./operations/updateRefs.js";
