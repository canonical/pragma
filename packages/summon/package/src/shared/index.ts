/**
 * Shared utilities for package generator
 */

export * from "./config/index.js";
export { default as createTemplateContext } from "./createTemplateContext.js";
export * from "./detection/index.js";
export { default as getPackageShortName } from "./getPackageShortName.js";
export { PACKAGE_NAME } from "./packageName.js";
export { packageVersion } from "./packageVersion.js";
export {
  default as resolveFramework,
  type FrameworkInput,
  type FrameworkResolution,
  resolveAnswers,
} from "./resolveFramework.js";
export type * from "./types.js";
export { default as validatePackageName } from "./validatePackageName.js";
