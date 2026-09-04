/**
 * The package's public surface: one factory and the two types naming its
 * options and its result.
 *
 * The internal cross-domain surface — the source collector, the prefix
 * harvester, and the eleven configuration constants — is deliberately NOT
 * re-exported. Those are decisions this package makes on the consumer's
 * behalf; `constants.ts` argues at length that they must not be configurable,
 * which is an argument for keeping them off the public surface rather than for
 * publishing them.
 *
 * @module lib
 */

export type {
  PragmaProvider,
  PragmaProviderOptions,
} from "./config/index.js";
export { createPragmaProvider } from "./provider/index.js";
