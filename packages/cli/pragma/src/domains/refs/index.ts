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

export {
  cacheRoot,
  gitCacheDir,
  globalConfigDir,
  parsePackageEntry,
  readGlobalRefs,
  updateRefs,
} from "./operations/index.js";
export type {
  PackageRef,
  RawPackageEntry,
  UpdateRefsOptions,
  UpdateResult,
} from "./operations/index.js";
