/**
 * Programmatic config file builders
 *
 * Each module builds one JSON config file as a typed object.
 * All exports share the same shape: (TemplateContext, ...) => string.
 */

export { buildBiomeJsonString } from "./biome-json.js";
export { buildPackageJson, buildPackageJsonString } from "./package-json.js";
export {
  buildTsconfigBuildJson,
  buildTsconfigJson,
} from "./tsconfig-json.js";
