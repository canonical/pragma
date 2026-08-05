/**
 * The `@canonical/summon-core/embedded` entry point.
 *
 * A SEPARATE entry from the package barrel on purpose: a compiled host imports
 * it to inject its manifest, and that import must not evaluate the generation
 * layer (which reaches Ink/React). Nothing here imports anything but `node:fs`.
 */

export type { EmbeddedFile } from "./loadEmbedded.js";
export {
  deriveEmbeddedKey,
  loadEmbeddedSync,
  setEmbeddedFiles,
} from "./loadEmbedded.js";
