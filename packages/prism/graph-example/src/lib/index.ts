/**
 * The package's public surface: the provider factory, the fetch handler built
 * on it, and the path that handler serves.
 *
 * The internal cross-domain surface — the dataset, the connection helpers, the
 * descriptive fallback chain, the SDL readers and the eleven constants — is
 * deliberately NOT re-exported. This package exists to be BOOTED and pointed
 * at, not to have its internals composed by a caller; its own tests reach them
 * by relative path, which is the right amount of access for them to have.
 *
 * @module lib
 */

export {
  createExampleProvider,
  type ExampleProvider,
  GRAPHQL_PATH,
} from "./provider/index.js";
export { createExampleHandler } from "./server/index.js";
