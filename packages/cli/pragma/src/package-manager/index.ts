/** @module Package manager detection and command templates. */
export { PM_COMMANDS } from "./constants.js";
export { default as detectInstallSource } from "./detectInstallSource.js";
export { default as detectLocalInstall } from "./detectLocalInstall.js";
export { default as detectPackageManager } from "./detectPackageManager.js";
export type { InstallSource, PackageManager } from "./types.js";
