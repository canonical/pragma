/**
 * Shared utilities and types for component generators
 */

export { default as createComponentPathPrompt } from "./createComponentPathPrompt.js";
export { default as createTemplateContext } from "./createTemplateContext.js";
export { default as failIfComponentExists } from "./failIfComponentExists.js";
export * from "./file-operations/index.js";
export { PACKAGE_NAME } from "./packageName.js";
export { packageVersion } from "./packageVersion.js";
export { default as sharedPrompts } from "./sharedPrompts.js";
export * from "./string-helpers/index.js";
export type * from "./types.js";
export { default as validateComponentPath } from "./validateComponentPath.js";
