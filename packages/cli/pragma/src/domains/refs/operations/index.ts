/** @module Refs operations — parsing, resolution, caching, and update logic. */

export type { PackageRef, RawPackageEntry } from "./parseRef.js";
export { parsePackageEntry } from "./parseRef.js";

export { cacheRoot, gitCacheDir, globalConfigDir } from "./paths.js";

export { default as readGlobalRefs } from "./readGlobalRefs.js";

export { cloneRef, fetchRef, isSha, pruneCache } from "./gitOps.js";

export type { UpdateRefsOptions, UpdateResult } from "./updateRefs.js";
export { default as updateRefs } from "./updateRefs.js";
