/**
 * The embedded-template seam: reader and writer of ONE key scheme, together.
 */

export type { EmbeddedRoot } from "./buildEmbeddedManifest.js";
export { default as buildEmbeddedManifest } from "./buildEmbeddedManifest.js";
export { default as qualifiedKey } from "./keyScheme.js";
export type { RawFileOptions } from "./rawFile.js";
export { default as rawFile } from "./rawFile.js";
export type { LoadedTemplate } from "./store.js";
export {
  embeddedPackageVersion,
  hasEmbeddedTemplates,
  loadTemplate,
  loadTemplateSync,
  setEmbeddedPackageVersions,
  setEmbeddedTemplates,
} from "./store.js";
