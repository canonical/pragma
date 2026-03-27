import type GeneratorDefinition from "./GeneratorDefinition.js";

/**
 * A generator definition without type parameters, used in barrels/collections.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant generator collections
type AnyGenerator = GeneratorDefinition<any>;

export default AnyGenerator;
